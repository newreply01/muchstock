const { pool } = require('../db');

const symbol = process.argv[2] || '2330';

async function extract() {
    try {
        const results = { symbol };
        
        // 1. Info
        const stockRes = await pool.query(`SELECT name, industry FROM stocks WHERE symbol = $1`, [symbol]);
        results.info = stockRes.rows[0] || { name: 'Unknown', industry: 'Unknown' };

        // 2. Prices & Indicators
        const priceRes = await pool.query(`
            SELECT p.*, i.rsi_14, i.macd_hist, i.ma_5, i.ma_10, i.ma_20, i.ma_60, i.patterns
            FROM daily_prices p
            LEFT JOIN indicators i ON p.symbol = i.symbol AND p.trade_date = i.trade_date
            WHERE p.symbol = $1
            ORDER BY p.trade_date DESC LIMIT 5`, [symbol]);
        results.prices = priceRes.rows;

        // 3. Fundamentals
        const fundRes = await pool.query(`SELECT * FROM fundamentals WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [symbol]);
        results.fundamentals = fundRes.rows[0];

        // 4. Institutional (Sum of last 5 days)
        const instRes = await pool.query(`
            SELECT trade_date, foreign_net, trust_net, dealer_net 
            FROM institutional_2025 
            WHERE symbol = $1 
            ORDER BY trade_date DESC LIMIT 5`, [symbol]);
        results.institutional = instRes.rows;

        // 5. Revenue
        const revRes = await pool.query(`SELECT * FROM monthly_revenue WHERE symbol = $1 ORDER BY revenue_year DESC, revenue_month DESC LIMIT 3`, [symbol]);
        results.revenue = revRes.rows;

        // 6. News
        const newsRes = await pool.query(`SELECT title, summary, publish_at FROM news WHERE (title ILIKE $1 OR summary ILIKE $1) ORDER BY publish_at DESC LIMIT 10`, [`%${symbol}%`]);
        results.news = newsRes.rows;

        const fs = require('fs');
        const outputPath = __dirname + '/context_data.json';
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log('✅ Context saved to ' + outputPath);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

extract();
