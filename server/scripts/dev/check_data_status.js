const { pool } = require('./db');

async function check() {
    try {
        const queries = {
            '收盤價 (daily_prices)': "SELECT MAX(trade_date) FROM daily_prices",
            '當沖資料 (fm_day_trading)': "SELECT MAX(date) FROM fm_day_trading",
            '個股法人 (institutional)': "SELECT MAX(trade_date) FROM institutional",
            '大盤法人 (fm_total_institutional)': "SELECT MAX(date) FROM fm_total_institutional",
            '個股融資券 (fm_margin_trading)': "SELECT MAX(date) FROM fm_margin_trading",
            '大盤融資券 (fm_total_margin)': "SELECT MAX(date) FROM fm_total_margin",
            '相關表格清單': "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%institutional%' OR table_name LIKE '%margin%'",
            '同步進度表 (fm_sync_progress)': "SELECT dataset, MAX(last_sync_date) FROM fm_sync_progress GROUP BY dataset",
            '關鍵系統排程 (system_status)': "SELECT service_name, status, message, check_time FROM system_status WHERE service_name IN ('twse_fetcher.js', 'calc_health_scores.js', 'calculate_indicators.js', 'finmind_daily', 'scheduler') ORDER BY check_time DESC LIMIT 30"
        };

        console.log("=== 數據到位狀況盤點 (今日: 2026-03-25) ===");
        for (const [name, sql] of Object.entries(queries)) {
            const res = await pool.query(sql);
            if (name === '關鍵系統排程 (system_status)') {
                console.log(`\n--- ${name} ---`);
                res.rows.forEach(row => {
                    console.log(`[${row.check_time.toLocaleString('zh-TW')}] ${row.service_name}: ${row.status} - ${row.message}`);
                });
            } else if (name === '相關表格清單') {
                console.log(`\n--- ${name} ---`);
                console.log(res.rows.map(r => r.table_name).join(', '));
            } else if (name === '同步進度表 (fm_sync_progress)') {
                console.log(`\n--- ${name} ---`);
                res.rows.forEach(row => {
                    console.log(`${row.dataset}: ${row.max.toLocaleString('zh-TW')}`);
                });
            } else {
                const date = res.rows[0].max;
                const dateStr = date ? (date instanceof Date ? date.toLocaleDateString('zh-TW') : date) : '無數據';
                console.log(`${name}: ${dateStr}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error("檢查失敗:", err.message);
        process.exit(1);
    }
}

check();
