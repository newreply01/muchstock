const { query, end } = require('../db');
async function f() {
    try {
        const res = await query('SELECT COUNT(*) FROM news_stock_sentiment');
        console.log('Total rows:', res.rows[0].count);
        const top = await query('SELECT symbol, count(*) FROM news_stock_sentiment GROUP BY symbol ORDER BY count DESC LIMIT 10');
        console.log('Top symbols:', JSON.stringify(top.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await end();
    }
}
f();
