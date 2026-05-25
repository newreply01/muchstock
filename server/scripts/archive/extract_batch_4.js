const { pool } = require('../db');
const fs = require('fs');

async function extractSingle(symbol) {
    const results = { symbol };
    try {
        const stockRes = await pool.query(`SELECT name, industry FROM stocks WHERE symbol = $1`, [symbol]);
        results.info = stockRes.rows[0] || { name: 'Unknown', industry: 'Unknown' };

        const priceRes = await pool.query(`
            SELECT p.*, i.rsi_14, i.macd_hist, i.ma_5, i.ma_10, i.ma_20, i.ma_60, i.patterns
            FROM daily_prices p
            LEFT JOIN indicators i ON p.symbol = i.symbol AND p.trade_date = i.trade_date
            WHERE p.symbol = $1
            ORDER BY p.trade_date DESC LIMIT 5`, [symbol]);
        results.prices = priceRes.rows;

        const fundRes = await pool.query(`SELECT * FROM fundamentals WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [symbol]);
        results.fundamentals = fundRes.rows[0];

        const instRes = await pool.query(`
            SELECT trade_date, foreign_net, trust_net, dealer_net 
            FROM institutional_2025 
            WHERE symbol = $1 
            ORDER BY trade_date DESC LIMIT 5`, [symbol]);
        results.institutional = instRes.rows;

        const revRes = await pool.query(`SELECT * FROM monthly_revenue WHERE symbol = $1 ORDER BY revenue_year DESC, revenue_month DESC LIMIT 3`, [symbol]);
        results.revenue = revRes.rows;

        const newsRes = await pool.query(`SELECT title, summary, publish_at FROM news WHERE (title ILIKE $1 OR summary ILIKE $1) ORDER BY publish_at DESC LIMIT 5`, [`%${symbol}%`]);
        results.news = newsRes.rows;
    } catch (e) {
        console.error(`Error extracting ${symbol}:`, e.message);
    }
    return results;
}

async function run() {
    const symbols = ['2615', '2605', '1402', '1309', '1409', '4958', '1717', '2323', '3059', '2377', '3014', '6213', '1305', '6415', '6285', '8069', '2367', '2383', '2312', '1312'];
    const batchResults = [];
    try {
        for (const s of symbols) {
            console.log(`Extracting ${s}...`);
            batchResults.push(await extractSingle(s));
        }
        fs.writeFileSync(__dirname + '/batch_context_4.json', JSON.stringify(batchResults, null, 2));
        console.log('✅ Batch 4 context saved');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
