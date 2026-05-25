const { pool } = require('./server/db');

async function check() {
    try {
        const resQueue = await pool.query("SELECT count(*) FROM ai_generation_queue WHERE report_date = '2026-04-03'");
        console.log(`Queue count for 2026-04-03: ${resQueue.rows[0].count}`);

        const resPrices = await pool.query("SELECT count(*) FROM daily_prices WHERE trade_date = '2026-04-03'");
        console.log(`Daily prices count for 2026-04-03: ${resPrices.rows[0].count}`);

        const resSample = await pool.query("SELECT symbol, volume FROM daily_prices WHERE trade_date = '2026-04-03' LIMIT 5");
        console.log('Sample data for 2026-04-03:', resSample.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
