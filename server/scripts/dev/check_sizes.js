const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'stock_screener',
  password: 'postgres123', port: 5533,
});
async function check() {
  const query = `
    SELECT 
      t.relname AS table_name,
      pg_size_pretty(pg_table_size(c.oid)) AS table_size,
      pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_stat_user_tables t ON t.relid = c.oid
    WHERE n.nspname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC;
  `;
  try {
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (e) {
    console.error(e.message);
  }
  await pool.end();
}
check();
