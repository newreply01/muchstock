
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://postgres.kerjbzcouktycwelznrn:hrejFG1JIlOHHb4f@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT trade_date, count(*) 
      FROM daily_prices 
      WHERE trade_date >= '2026-03-25' 
      AND symbol ~ '^[0-9]{4}$'
      GROUP BY trade_date 
      ORDER BY trade_date DESC;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
