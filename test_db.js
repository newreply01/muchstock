require('dotenv').config({path: '.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT dataset, MAX(date) as last_updated FROM sync_progress WHERE dataset IN ('TaiwanStockDayTrading', 'TaiwanStockTotalReturnIndex') GROUP BY dataset")
    .then(r => console.log('sync_progress:', r.rows))
    .catch(console.error)
    .finally(() => pool.end());
