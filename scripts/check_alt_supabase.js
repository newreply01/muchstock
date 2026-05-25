const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.gfwlifpmstidgudgojwe:HfSDHrdekEY0vLPz@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
});

async function check() {
  try {
    console.log('--- Checking ALTERNATIVE Supabase (gfwlifpmstidgudgojwe) ---');
    const res = await pool.query('SELECT trade_date, count(*) FROM daily_prices GROUP BY trade_date ORDER BY trade_date DESC LIMIT 5');
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}
check();
