const { Client } = require('pg');
(async () => {
    const client = new Client({
        connectionString: 'postgresql://postgres.gfwlifpmstidgudgojwe:HfSDHrdekEY0vLPz@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query("SELECT count(*) FROM fundamentals WHERE symbol = '2330'");
        console.log('Remote count for 2330:', res.rows[0]);
        
        const latest = await client.query("SELECT * FROM fundamentals WHERE symbol = '2330' ORDER BY trade_date DESC LIMIT 5");
        console.log('Latest 5 records for 2330:', latest.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
})();
