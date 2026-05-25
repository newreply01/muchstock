const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
};

const pool = new Pool(config);

async function run() {
    try {
        console.log('🔍 Checking Supabase tables...');
        const res = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        const tables = res.rows.map(r => r.tablename);
        
        for (const t of tables) {
            try {
                const countRes = await pool.query(`SELECT count(*) FROM public."${t}"`);
                console.log(`📊 ${t}: ${countRes.rows[0].count} rows`);
            } catch (e) {
                console.log(`⚠️ ${t}: ${e.message}`);
            }
        }
    } catch (err) {
        console.error('❌ Connection error:', err.message);
    } finally {
        await pool.end();
    }
}

run();
