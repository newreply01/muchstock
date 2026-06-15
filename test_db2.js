require('dotenv').config({path: '.env'});
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
pool.query("SELECT dataset, MAX(last_sync_date) as last_updated, COUNT(*) as c FROM fm_sync_progress WHERE dataset IN ('TaiwanStockDayTrading', 'TaiwanStockTotalReturnIndex') GROUP BY dataset")
    .then(r => console.log('sync_progress:', r.rows))
    .catch(console.error)
    .finally(() => pool.end());
