#!/usr/bin/env node

const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('../server/db');

const command = process.argv[2];

const helpMessage = `
==============================================
 台股篩選器 (Stock Screener) 統一運維 CLI 工具
==============================================
使用方法: node scripts/cli.js <command> [arguments]

可用命令:
  verify-keys   - 檢測當前 GEMINI_API_KEYS 中的所有金鑰狀態與額度
  reset-queue   - 將處理逾時 (卡死 > 15 分鐘) 的 AI 佇列任務重置為 pending
  data-lcm      - 執行資料庫生命週期管理 (LCM)，自動清洗與格式化 AI 報告內容
  help          - 顯示此說明訊息

範例:
  node scripts/cli.js verify-keys
  node scripts/cli.js reset-queue
`;

async function handleVerifyKeys() {
    console.log(`\n=============================================`);
    console.log(`🔍 正在檢測 GEMINI_API_KEYS 狀態...`);
    console.log(`=============================================`);
    
    const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
        .split(",")
        .map(k => k.trim())
        .filter(k => k.length > 20);

    if (apiKeys.length === 0) {
        console.error(`❌ 未找到有效的 GEMINI_API_KEY，請確認 .env 設定。`);
        return;
    }

    console.log(`共找到 ${apiKeys.length} 組金鑰，開始進行連線與模型測試 (gemma-4-31b-it)...`);

    for (let i = 0; i < apiKeys.length; i++) {
        const key = apiKeys[i];
        const hint = key.substring(0, 8) + '...' + key.substring(key.length - 4);
        
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemma-4-31b-it" });
            const start = Date.now();
            await model.generateContent("Hi");
            const elapsed = Date.now() - start;
            console.log(`✅ 金鑰 [${i}] (${hint}): 連線成功 (回應時間: ${elapsed}ms)`);
        } catch (err) {
            console.error(`❌ 金鑰 [${i}] (${hint}): 連線失敗 - ${err.message}`);
        }
    }
    console.log(`=============================================\n`);
}

async function handleResetQueue() {
    console.log(`\n=============================================`);
    console.log(`🔄 正在重設卡死的 AI 佇列任務...`);
    console.log(`=============================================`);
    
    try {
        // 修復卡死的任務 (超過 15 分鐘未更新者)
        const resetRes = await pool.query(`
            UPDATE ai_generation_queue 
            SET status = 'pending', start_at = NULL 
            WHERE status = 'processing' 
              AND (start_at < NOW() - INTERVAL '15 minutes' OR start_at IS NULL)
        `);
        console.log(`✅ 已自動重置 ${resetRes.rowCount} 筆逾時 (>15分鐘) 的處理中任務為 Pending。`);
        
        // 輸出目前進度
        const progress = await pool.query(`
            SELECT status, count(*) as count 
            FROM ai_generation_queue 
            GROUP BY status
            ORDER BY status
        `);
        console.log('\n--- 目前佇列狀態詳情 ---');
        console.table(progress.rows);
    } catch (err) {
        console.error(`❌ 重設佇列失敗: ${err.message}`);
    }
    console.log(`=============================================\n`);
}



async function handleDataLcm() {
    console.log(`\n=============================================`);
    console.log(`🧹 正在執行資料庫報告清洗與生命週期管理...`);
    console.log(`=============================================`);
    
    try {
        const query = `
            SELECT symbol, report_date, content FROM ai_reports 
            WHERE content NOT LIKE '#### 📝 %' 
               OR content ILIKE '%is mentioned in instructions%'
               OR content ILIKE '%follow the template%'
        `;

        const res = await pool.query(query);
        console.log(`發現 ${res.rowCount} 份報告格式可能含有冗餘 Meta 說明，開始清洗...`);

        let cleanedCount = 0;
        for (const row of res.rows) {
            let content = row.content;
            const original = content;

            // 1. 移除 thought 標籤
            content = content.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

            // 2. 標題鎖定並切除前置文字
            const realTitleRegex = /#\s+[\u4e00-\u9fa5\w\s]+\(\d{4,6}\)\s+深度投資分析報告/g;
            const matches = [...content.matchAll(realTitleRegex)];

            if (matches.length > 0) {
                const lastMatch = matches[matches.length - 1];
                if (lastMatch.index > 0) {
                    content = content.substring(lastMatch.index).trim();
                }
            } else {
                const sectionMarkers = [
                    /#### 📝 核心趨勢總結/, /#### 📢 個股摘要/, /#### 🧪 基本面/
                ];
                
                let lastValidIndex = -1;
                for(const marker of sectionMarkers) {
                    const sMatches = [...content.matchAll(new RegExp(marker, 'g'))];
                    if (sMatches.length > 0) {
                        const lastM = sMatches[sMatches.length - 1];
                        const checkArea = content.substring(lastM.index, lastM.index + 100);
                        if (!checkArea.includes('is mentioned in instructions') && !checkArea.includes('follow the template')) {
                            if (lastM.index > lastValidIndex) lastValidIndex = lastM.index;
                        }
                    }
                }

                if (lastValidIndex > 0) {
                    content = content.substring(lastValidIndex).trim();
                }
            }

            // 3. 移除對話型垃圾文字
            const metaTalkPatterns = [
                /#### 📝 核心趨勢總結 is mentioned in instructions[\s\S]*?(\n(?=#)|$)/gi,
                /I will follow the template provided at the end of the prompt\)\.?/gi,
                /Professional Taiwan Stock Investment Analyst[\s\S]*?(?=#)/gi,
                /Use provided data only[\s\S]*?(?=#)/gi
            ];
            for (const p of metaTalkPatterns) {
                content = content.replace(p, '').trim();
            }

            if (content !== original && content.length > 50) {
                await pool.query(
                    "UPDATE ai_reports SET content = $1, updated_at = NOW() WHERE symbol = $2 AND report_date = $3",
                    [content, row.symbol, row.report_date]
                );
                cleanedCount++;
            }
        }
        console.log(`✅ 清理完成！共修正並清洗了 ${cleanedCount} 份報告內容。`);
    } catch (err) {
        console.error(`❌ 清洗報告失敗: ${err.message}`);
    }
    console.log(`=============================================\n`);
}

async function main() {
    switch (command) {
        case 'verify-keys':
            await handleVerifyKeys();
            break;
        case 'reset-queue':
            await handleResetQueue();
            break;

        case 'data-lcm':
            await handleDataLcm();
            break;
        case 'help':
        default:
            console.log(helpMessage);
            break;
    }
    
    // 釋放資料庫連線池並退出
    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error('CLI 執行發生致命錯誤:', err);
    process.exit(1);
});
