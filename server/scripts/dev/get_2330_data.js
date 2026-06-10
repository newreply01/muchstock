const { query } = require('./db');
async function getContext(symbol) {
    try {
        const fundamentalRes = await query(`SELECT * FROM fundamentals WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [symbol]);
        const priceRes = await query(`SELECT p.*, i.rsi_14, i.macd_hist, i.ma_5, i.ma_10, i.ma_20, i.ma_60, i.patterns FROM daily_prices p LEFT JOIN indicators i ON p.symbol = i.symbol AND p.trade_date = i.trade_date WHERE p.symbol = $1 ORDER BY p.trade_date DESC LIMIT 1`, [symbol]);
        const newsRes = await query(`SELECT title, summary, publish_at FROM news WHERE (title ILIKE $1 OR summary ILIKE $1) ORDER BY publish_at DESC LIMIT 5`, [`%${symbol}%`]);
        const stockRes = await query(`SELECT name FROM stocks WHERE symbol = $1`, [symbol]);
        
        console.log('---DATA_START---');
        console.log(JSON.stringify({
            name: stockRes.rows[0]?.name,
            symbol,
            price: priceRes.rows[0],
            fundamental: fundamentalRes.rows[0],
            news: newsRes.rows
        }, null, 2));
        console.log('---DATA_END---');
    } catch (e) { console.error(e); }
    finally { process.exit(0); }
}
getContext('2330');
