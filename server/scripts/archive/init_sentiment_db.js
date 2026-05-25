const { query, end } = require('../db');

async function init() {
    try {
        console.log('🛠️ 建立 news_stock_sentiment 表...');
        await query(`
            CREATE TABLE IF NOT EXISTS news_stock_sentiment (
                id SERIAL PRIMARY KEY,
                news_id BIGINT REFERENCES news(news_id) ON DELETE CASCADE,
                symbol VARCHAR(20) NOT NULL,
                sentiment VARCHAR(20),
                score NUMERIC,
                method VARCHAR(20) DEFAULT 'rule',
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(news_id, symbol)
            )
        `);
        console.log('✅ 表建立完成。');
    } catch (err) {
        console.error('❌ 建立失敗:', err.message);
    } finally {
        await end();
    }
}

init();
