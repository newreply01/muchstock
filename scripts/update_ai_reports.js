const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('../server/db');
const { generateAIReport } = require('../server/utils/ai_service');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 並行 worker 數量 (Ollama 同時推理數，建議不超過 GPU 記憶體容量)
const CONCURRENCY = parseInt(process.env.AI_CONCURRENCY || '2');
// 任務間隔 (ms)，避免 Ollama OOM
const TASK_DELAY = parseInt(process.env.AI_TASK_DELAY || '500');

async function processNextTask(batchSize = 1) {
    try {
        const res = await pool.query(`
            UPDATE ai_generation_queue
            SET status = 'processing', start_at = NOW()
            WHERE (report_date, symbol) IN (
                SELECT report_date, symbol FROM ai_generation_queue 
                WHERE status = 'pending' 
                   OR (status = 'failed' 
                       AND retry_count < 5 
                       AND (completed_at IS NULL OR completed_at < NOW() - (INTERVAL '1 minute' * POWER(2, retry_count))))
                ORDER BY report_date DESC, priority_value DESC LIMIT $1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING symbol, report_date, model_name;
        `, [batchSize]);

        if (res.rowCount === 0) {
            return []; // 無 pending 任務
        }

        return res.rows.map(task => ({
            symbol: task.symbol, 
            reportDate: task.report_date instanceof Date ? task.report_date.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) : task.report_date,
            modelName: task.model_name
        }));

    } catch (err) {
        console.error('領取任務時發生錯誤:', err);
        return [];
    }
}

async function markTaskResult(symbol, reportDate, status, content = null, sentimentScore = 50, errMsg = null, mode = 'ollama', modelName = 'gemma-4-31b-it') {
    try {
        // 1. 儲存 AI 報告 (堆疊化: 以 symbol + report_date 為唯一標識)
        if (status === 'completed' && content) {
            await pool.query(`
                INSERT INTO ai_reports (symbol, report_date, content, sentiment_score, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (symbol, report_date) DO UPDATE SET 
                    content = EXCLUDED.content,
                    sentiment_score = EXCLUDED.sentiment_score,
                    updated_at = NOW();
            `, [symbol, reportDate, content, sentimentScore]);
        }

        // 2. 更新隊列狀態
        await pool.query(`
            UPDATE ai_generation_queue
            SET 
                status = $1::TEXT, 
                completed_at = NOW(), 
                error_msg = $2, 
                generation_mode = $3, 
                model_name = $4,
                retry_count = CASE WHEN $1::TEXT = 'failed' THEN retry_count + 1 ELSE retry_count END
            WHERE report_date = $5 AND symbol = $6
        `, [status, errMsg, mode, modelName, reportDate, symbol]);
    } catch (err) {
        console.error(`[markTaskResult] Error for ${symbol}:`, err.message);
    }
}

async function updateScriptStatus(status, message) {
    try {
        await pool.query(`
            INSERT INTO script_status (script, last_run, status, message)
            VALUES ('update_ai_reports.js', NOW(), $1, $2)
            ON CONFLICT (script) DO UPDATE SET 
                last_run = EXCLUDED.last_run,
                status = EXCLUDED.status,
                message = EXCLUDED.message
        `, [status, message]);
    } catch (err) {
        console.error('Failed to update script status:', err);
    }
}

async function processOneTask(task) {
    const { symbol, reportDate, modelName } = task;
    const start = Date.now();

    try {
        const result = await generateAIReport(symbol, modelName);

        if (result.success) {
            const elapsed = ((Date.now() - start)/1000).toFixed(1);
            console.log(`  ✅ ${symbol} 成功 (${elapsed}s, 核心: ${result.modelName})`);
            await markTaskResult(symbol, reportDate, 'completed', result.content, result.sentimentScore, null, result.generationMode, result.modelName);
            return true;
        } else {
            console.error(`  ❌ ${symbol} 失敗: ${result.error}`);
            await markTaskResult(symbol, reportDate, 'failed', null, 50, result.error, result.generationMode || 'none', result.modelName || modelName);
            return false;
        }
    } catch (err) {
        console.error(`  ❌ ${symbol} 異常: ${err.message}`);
        await markTaskResult(symbol, reportDate, 'failed', null, 50, err.message, 'none', modelName);
        return false;
    }
}

async function runQueueProcessor() {
    console.log(`--- [Resident Worker] AI 分流生成系統啟動 ---`);
    console.log(`--- 並行度: ${CONCURRENCY}, 任務間隔: ${TASK_DELAY}ms ---`);

    let consecutiveErrors = 0;
    let totalCompleted = 0;
    const globalStart = Date.now();

    while (true) {
        const tasks = await processNextTask(CONCURRENCY);
        
        if (tasks.length === 0) {
            const elapsed = ((Date.now() - globalStart) / 1000 / 60).toFixed(1);
            console.log(`[${new Date().toLocaleTimeString()}] 無待處理任務 (累計完成: ${totalCompleted}, 耗時: ${elapsed}min)，10 分鐘後重試...`);
            await updateScriptStatus('WAITING', `所有任務已完成 (累計: ${totalCompleted})，待命中`);
            await sleep(600000); 
            continue;
        }

        const symbols = tasks.map(t => t.symbol).join(', ');
        console.log(`\n[${new Date().toLocaleTimeString()}] ▶️ 並行處理 ${tasks.length} 檔: [${symbols}]`);
        await updateScriptStatus('RUNNING', `並行分析 ${tasks.length} 檔: ${symbols}`);

        // 並行執行所有任務
        const results = await Promise.allSettled(tasks.map(task => processOneTask(task)));

        let batchErrors = 0;
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value === true) {
                totalCompleted++;
                consecutiveErrors = 0;
            } else {
                batchErrors++;
                consecutiveErrors++;
            }
        }

        if (consecutiveErrors >= 10) {
            console.error(`⚠️ 連續失敗 ${consecutiveErrors} 次，冷卻 5 分鐘...`);
            await sleep(300000); 
            consecutiveErrors = 0;
        } else {
            await sleep(TASK_DELAY); 
        }
    }
}

runQueueProcessor().catch(err => {
    console.error('Worker 崩潰:', err);
    process.exit(1);
});
