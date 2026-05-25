const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'stock_screener',
    password: 'postgres123',
    port: 5533,
});

(async () => {
    const res = await pool.query("SELECT count(*) FROM realtime_ticks WHERE DATE(trade_time) = '2026-03-23'");
    console.log('Ticks for 2026-03-23:', res.rows[0]);
    
    const sample = await pool.query("SELECT * FROM realtime_ticks WHERE DATE(trade_time) = '2026-03-23' LIMIT 1");
    console.log('Sample tick:', sample.rows[0]);
    
    await pool.end();
})();
