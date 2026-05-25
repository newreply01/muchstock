require('dotenv').config({ path: __dirname + '/../../.env' });
const { pool } = require('../db');
const { updateDailyStats } = require('../utils/statsAggregator');

async function init() {
    console.log('--- 準備初始化 system_ingestion_daily_stats 資料表 ---');

    try {
        // 1. 建立資料表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_ingestion_daily_stats (
                trade_date DATE PRIMARY KEY,
                price_count INTEGER DEFAULT 0,
                inst_count INTEGER DEFAULT 0,
                margin_count INTEGER DEFAULT 0,
                news_count INTEGER DEFAULT 0,
                realtime_count INTEGER DEFAULT 0,
                stats_count INTEGER DEFAULT 0,
                health_count INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ 資料表 system_ingestion_daily_stats 確認存在或已建立');

        // 2. 建立其他大表的日期索引 (加強未來統計單日的效能)
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON daily_prices (trade_date)',
            'CREATE INDEX IF NOT EXISTS idx_inst_trade_date ON institutional (trade_date)',
            'CREATE INDEX IF NOT EXISTS idx_margin_date ON fm_margin_trading (date)',
            'CREATE INDEX IF NOT EXISTS idx_news_publish_at ON news (publish_at)',
            'CREATE INDEX IF NOT EXISTS idx_realtime_ticks_time ON realtime_ticks (trade_time)',
            'CREATE INDEX IF NOT EXISTS idx_realtime_ticks_h_time ON realtime_ticks_history (trade_time)'
        ];

        for (const idx of indexes) {
            await pool.query(idx);
        }
        console.log('✅ 日期索引建立完畢');

        // 3. 回推過去 15 天的資料進行回補統計 (讓歷史資料有東西展示)
        console.log('--- 開始回補過去 15 天的統計資料 ---');
        for (let i = 15; i >= 1; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            await updateDailyStats(dateStr);
        }

        console.log('🎉 初始化作業已全部完成');
        process.exit(0);

    } catch (err) {
        console.error('初始化失敗:', err);
        process.exit(1);
    }
}

init();
