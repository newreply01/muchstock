const { pool } = require('../db');

async function check() {
    try {
        const res = await pool.query(`
            SELECT symbol, close_price, change_amount, change_percent, trade_date 
            FROM daily_prices 
            WHERE symbol IN ('2330', '2317', '2382') 
            ORDER BY trade_date DESC 
            LIMIT 10
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
