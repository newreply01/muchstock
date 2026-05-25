const { pool } = require('./server/db');

async function check() {
    try {
        const res = await pool.query("SELECT * FROM trading_dates WHERE date >= '2026-04-01' AND date <= '2026-04-05' ORDER BY date ASC");
        console.log('Trading dates:', res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
