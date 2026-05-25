const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.SUPABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('🔍 Checking Supabase tables...');
        const tables = [
            'fm_margin_trading',
            'institutional_2024',
            'institutional_2025',
            'institutional_2026',
            'daily_prices',
            'stocks'
        ];

        for (const t of tables) {
            try {
                const res = await pool.query(`SELECT count(*) as count FROM public.${t}`);
                console.log(`✅ ${t}: ${res.rows[0].count} rows`);
            } catch (e) {
                console.log(`❌ ${t}: ${e.message}`);
            }
        }
    } finally {
        await pool.end();
    }
}

run();
