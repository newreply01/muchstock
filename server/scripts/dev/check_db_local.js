const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stock_screener',
  password: 'postgres123',
  port: 5533,
});
async function check() {
  const tables = ['stocks', 'daily_prices', 'fundamentals', 'fm_total_institutional', 'fm_total_margin', 'stock_health_scores', 'ai_reports'];
  console.log('--- Database Row Count & Est. Size ---');
  for (const table of tables) {
    try {
      const res = await pool.query('SELECT COUNT(*) FROM ' + table);
      const count = parseInt(res.rows[0].count);
      let estSize = 0;
      // Rough estimates per row
      if (table === 'daily_prices') estSize = count * 120;
      else if (table === 'fundamentals') estSize = count * 80;
      else if (table === 'stock_health_scores') estSize = count * 500;
      else if (table === 'ai_reports') estSize = count * 2000;
      else estSize = count * 100;
      
      console.log(`${table}: ${count} rows (~${(estSize / 1024 / 1024).toFixed(2)} MB)`);
    } catch (e) {
      console.log(table + ': Error - ' + e.message);
    }
  }
  await pool.end();
}
check();
