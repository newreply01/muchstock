const { Pool } = require('pg');
require('dotenv').config({ path: '/home/xg/stock-screener/.env' });

async function fix() {
  const pool = new Pool({ connectionString: process.env.SUPABASE_URL });
  try {
    console.log('Resetting sequence...');
    await pool.query("SELECT setval('stock_health_scores_id_seq', (SELECT MAX(id) FROM stock_health_scores))");
    console.log('Sequence reset complete!');
  } catch (e) {
    console.log('Error:', e.message);
  }
  await pool.end();
}
fix();
