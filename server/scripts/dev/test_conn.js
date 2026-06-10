const { pool } = require('./db');

async function testConnection() {
    console.log('Testing database connection...');
    console.log('Config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
    });
    
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('Connection successful!');
        console.log('Server time:', res.rows[0].now);
        
        const dbRes = await pool.query("SELECT datname FROM pg_database WHERE datname = 'stock_screener'");
        if (dbRes.rows.length > 0) {
            console.log("Database 'stock_screener' exists.");
        } else {
            console.log("Database 'stock_screener' does NOT exist.");
        }
        
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
