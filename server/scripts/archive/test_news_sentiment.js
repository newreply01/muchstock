const { pool } = require('../db');
const NewsSentiment = require('../utils/newsSentiment');

(async () => {
    console.log('--- 🧪 新聞情緒辨識 多標的分散測試 ---');
    try {
        // 1. 模擬插入一則含多標的的新聞
        const testNewsId = 999999;
        const title = '半導體強勢反彈！(2330) 台積電領軍衝高，帶動 (0050) 元大台灣50 與 (2317) 鴻海同步轉強。';
        const summary = '受惠美股回升，權值股今日表現亮眼，市場看好後市展望。';

        // 先清理舊測試資料
        await pool.query('DELETE FROM news WHERE news_id = $1', [testNewsId]);
        await pool.query('DELETE FROM news_stock_sentiment WHERE news_id = $1', [testNewsId]);

        // 插入測試新聞
        await pool.query(`
            INSERT INTO news (news_id, category, title, summary, publish_at) 
            VALUES ($1, '測試', $2, $3, NOW())
        `, [testNewsId, title, summary]);

        console.log('✅ 測試新聞已入庫，開始執行辨識...');

        // 2. 執行處理
        const result = await NewsSentiment.processNews(testNewsId, false); // 先測 Rule 模式
        console.log('辨識到的標的:', result.symbols);

        // 3. 驗證資料庫結果
        const res = await pool.query('SELECT symbol, sentiment, score, reason FROM news_stock_sentiment WHERE news_id = $1', [testNewsId]);
        console.log('\n--- 資料庫生成結果 ---');
        console.table(res.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
