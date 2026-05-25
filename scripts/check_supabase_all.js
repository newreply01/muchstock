const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://postgres.kerjbzcouktycwelznrn:hrejFG1JIlOHHb4f@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
});

async function check() {
  try {
    console.log('--- Checking AI Reports ---');
    const resReports = await pool.query('SELECT report_date, count(*) FROM ai_reports GROUP BY report_date ORDER BY report_date DESC LIMIT 5');
    console.table(resReports.rows);

    console.log('--- Checking Stock Health Scores ---');
    const resScores = await pool.query('SELECT calc_date, count(*) FROM stock_health_scores GROUP BY calc_date ORDER BY calc_date DESC LIMIT 5');
    console.table(resScores.rows);
    
    console.log('--- Checking Daily Prices ---');
    const resPrices = await pool.query('SELECT trade_date, count(*) FROM daily_prices GROUP BY trade_date ORDER BY trade_date DESC LIMIT 5');
    console.table(resPrices.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
