const { pool } = require('../db');

/**
 * 自動修復：將異常卡死 (Processing > 12 Min) 的任務重設為 Pending
 */
async function maintenance() {
    console.log('--- [Maintenance] 執行系統維護與進度校準 ---');
    try {
        // 1. 新聞情緒補全：確保生成前所有新聞都已完成標記
        console.log('🔄 正在同步新聞情緒數據...');
        const NewsSentiment = require('../utils/newsSentiment');
        const newsItems = await pool.query(`
            SELECT news_id FROM news 
            WHERE news_id NOT IN (SELECT DISTINCT news_id FROM news_stock_sentiment)
            ORDER BY publish_at DESC LIMIT 500
        `);
        if (newsItems.rows.length > 0) {
            console.log(`發現 ${newsItems.rows.length} 則未解析新聞，開始批次處理...`);
            for (const item of newsItems.rows) {
                await NewsSentiment.processNews(item.news_id);
            }
            console.log('✅ 新聞情緒同步完成。');
        }

        // 2. 修復卡死的任務 (超過 15 分鐘未更新者)
        const resetRes = await pool.query(`
            UPDATE ai_generation_queue 
            SET status = 'pending', start_at = NULL 
            WHERE status = 'processing' 
              AND (start_at < NOW() - INTERVAL '15 minutes' OR start_at IS NULL)
        `);
        if (resetRes.rowCount > 0) {
            console.log(`✅ 已自動重置 ${resetRes.rowCount} 筆逾時或異常任務。`);
        }

        // 2. 輸出最新進度
        const progress = await pool.query(`
            SELECT 
                model_name, 
                status, 
                count(*) as count 
            FROM ai_generation_queue 
            WHERE report_date = (SELECT MAX(report_date) FROM ai_generation_queue)
            GROUP BY model_name, status
            ORDER BY model_name, status
        `);
        console.log('\n--- 目前生成詳情 ---');
        console.table(progress.rows);

        // 3. 正在處理中的標的
        const current = await pool.query(`
            SELECT symbol, model_name, start_at FROM ai_generation_queue 
            WHERE status = 'processing'
        `);
        if (current.rows.length > 0) {
            console.log('\n▶️ 目前 Worker 正在處理的標的：');
            console.table(current.rows);
        } else {
            console.log('\n📭 目前無運作中的標的。');
        }

        process.exit(0);
    } catch (err) {
        console.error('維護發生錯誤:', err);
        process.exit(1);
    }
}

maintenance();
