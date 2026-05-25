require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Client } = require('pg');
(async () => {
    const client = new Client({
        connectionString: process.env.SUPABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        
        const tables = [
            'stocks', 
            'ai_prompt_templates', 
            'stock_health_scores', 
            'ai_reports', 
            'daily_prices', 
            'fundamentals', 
            'fm_total_institutional', 
            'fm_total_margin', 
            'realtime_ticks'
        ];
        
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT count(*) FROM public.${table}`);
                console.log(`Table ${table}: ${res.rows[0].count} rows`);
            } catch (e) {
                console.log(`Table ${table}: ERROR - ${e.message}`);
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
})();
