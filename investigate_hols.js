const { pool } = require('./server/db');

async function check() {
    try {
        const res = await pool.query("SELECT s.market, count(*) FROM daily_prices dp JOIN stocks s ON dp.symbol = s.symbol WHERE dp.trade_date = '2026-04-03' GROUP BY s.market");
        console.log('Market distribution for 4/3:', res.rows);
        
        const res2 = await pool.query("SELECT symbol, volume, close_price FROM daily_prices WHERE symbol = '2330' AND trade_date IN ('2026-04-02', '2026-04-03')");
        console.log('2330 data for 4/2 vs 4/3:', res2.rows);

        const res3 = await pool.query("SELECT symbol, volume, close_price FROM daily_prices WHERE symbol = '006201' AND trade_date IN ('2026-04-02', '2026-04-03')");
        console.log('006201 data for 4/2 vs 4/3:', res3.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
