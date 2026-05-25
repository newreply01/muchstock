const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'stock_screener', password: 'postgres123', port: 5533 });

async function check() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'news' AND table_schema = 'public'");
    console.log('--- News Table Columns ---');
    res.rows.forEach(r => {
      console.log(`${r.column_name}: ${r.data_type}`);
    });
  } catch (e) {
    console.log('Error:', e.message);
  }
  await pool.end();
}
check();
