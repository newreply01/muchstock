const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'stock_screener',
    password: 'postgres123',
    port: 5432
});

async function run() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daily_prices'");
        console.log('--- daily_prices COLUMNS ---');
        console.table(res.rows);

        const resMargin = await pool.query("SELECT max(date) as max_date FROM fm_total_margin");
        console.log('LATEST_MARGIN:', resMargin.rows[0].max_date);

        const resTAIEX = await pool.query("SELECT max(trade_date) as max_date FROM daily_prices WHERE symbol = 'TAIEX'");
        console.log('LATEST_TAIEX:', resTAIEX.rows[0].max_date);

        const res3 = await pool.query("SELECT trade_date, close_price FROM daily_prices WHERE symbol = 'TAIEX' AND trade_date >= '2025-12-20' AND trade_date <= '2026-01-05' ORDER BY trade_date");
        console.log('\n--- TAIEX Dec Gap Check ---');
        console.table(res3.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
run();
