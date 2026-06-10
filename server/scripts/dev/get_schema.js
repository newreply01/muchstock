const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stock_screener',
  password: 'postgres123',
  port: 5533,
});
async function schema() {
  const table = 'fm_total_margin';
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '" + table + "'");
    console.log('Schema for ' + table + ':');
    res.rows.forEach(row => console.log(row.column_name + ' (' + row.data_type + ')'));
    
    const sample = await pool.query("SELECT * FROM " + table + " ORDER BY date DESC LIMIT 1");
    console.log('\nLatest row:');
    console.log(JSON.stringify(sample.rows[0], null, 2));
  } catch (e) {
    console.log(e.message);
  }
  await pool.end();
}
schema();
