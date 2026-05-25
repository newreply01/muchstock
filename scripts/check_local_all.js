const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stock_screener',
  password: 'postgres123',
  port: 5533,
});

async function check() {
  try {
    console.log('--- Checking LOCAL AI Reports ---');
    const resReports = await pool.query('SELECT report_date, count(*) FROM ai_reports GROUP BY report_date ORDER BY report_date DESC LIMIT 5');
    console.table(resReports.rows);

    console.log('--- Checking LOCAL Stock Health Scores ---');
    const resScores = await pool.query('SELECT calc_date, count(*) FROM stock_health_scores GROUP BY calc_date ORDER BY calc_date DESC LIMIT 5');
    console.table(resScores.rows);
    
    console.log('--- Checking LOCAL Daily Prices ---');
    const resPrices = await pool.query('SELECT trade_date, count(*) FROM daily_prices GROUP BY trade_date ORDER BY trade_date DESC LIMIT 5');
    console.table(resPrices.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
