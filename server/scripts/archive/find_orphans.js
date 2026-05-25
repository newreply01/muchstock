const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'stock_screener',
    password: 'postgres123',
    port: 5533,
});

async function findOrphans() {
    try {
        const symbolFilter = "(symbol ~ '^\\d{4}$' OR symbol ~ '^00.*')";
        const res = await pool.query(`
            SELECT DISTINCT symbol FROM daily_prices 
            WHERE ${symbolFilter} 
            AND symbol NOT IN (SELECT symbol FROM stocks WHERE ${symbolFilter})
        `);
        console.log('Orphan symbols in daily_prices:', res.rows.map(r => r.symbol));
        
        const fundRes = await pool.query(`
            SELECT DISTINCT symbol FROM fundamentals 
            WHERE ${symbolFilter} 
            AND symbol NOT IN (SELECT symbol FROM stocks WHERE ${symbolFilter})
        `);
        console.log('Orphan symbols in fundamentals:', fundRes.rows.map(r => r.symbol));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findOrphans();
