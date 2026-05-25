const { pool } = require('../db');
const fs = require('fs');
const { calculateScores } = require('../utils/factor_scoring_service');

async function extractSingle(symbol) {
    const results = { symbol };
    try {
        console.log(`Calculating 7-factor scores for ${symbol}...`);
        results.scores = await calculateScores(symbol);

        const stockRes = await pool.query(`SELECT name, industry FROM stocks WHERE symbol = $1`, [symbol]);
        results.info = stockRes.rows[0] || { name: 'Unknown', industry: 'Unknown' };
        
        // ... rest of extraction (prices, fund, inst, rev, news)
        // I will simplify the extractSingle or keep the detailed data for AI to "explain" the scores
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
    // Correct Batch 5 (Indices 138-168): 
    const symbols = ['1504', '1536', '1722', '2332', '2345', '2368', '2379', '2393', '2404', '2412', '2439', '2449', '2454', '2457', '2458', '2474', '2492', '2498', '2606', '2607', '2611', '2613', '2633', '2634', '2637', '2812', '2834', '2851', '2867', '1102'];
    const batchResults = [];
    try {
        for (const s of symbols) {
            console.log(`Extracting ${s}...`);
            batchResults.push(await extractSingle(s));
        }
        fs.writeFileSync(__dirname + '/batch_context_5.json', JSON.stringify(batchResults, null, 2));
        console.log('✅ Batch 5 context (with 7-factor scores) saved');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
