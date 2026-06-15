require('dotenv').config({path: '.env'});
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
    try {
        // Realtime
        const rMax = await pool.query("SELECT MAX(DATE(trade_time)) as m FROM realtime_ticks_history");
        const rDate = rMax.rows[0].m;
        if(rDate) {
            const tickRes = await pool.query("SELECT COUNT(*) as c, SUM(pg_column_size(t.*)) as bytes FROM realtime_ticks_history t WHERE DATE(trade_time) = $1", [rDate]);
            console.log(`Realtime (${rDate}):`, tickRes.rows[0].c, "rows,", (tickRes.rows[0].bytes / 1024 / 1024).toFixed(2), "MB");
        }

        // Day Trading
        const dMax = await pool.query("SELECT MAX(date) as m FROM fm_day_trading");
        const dDate = dMax.rows[0].m;
        if(dDate) {
            const dayRes = await pool.query("SELECT COUNT(*) as c, SUM(pg_column_size(t.*)) as bytes FROM fm_day_trading t WHERE date = $1", [dDate]);
            console.log(`Day Trading (${dDate}):`, dayRes.rows[0].c, "rows,", (dayRes.rows[0].bytes / 1024 / 1024).toFixed(2), "MB");
        }

        // Margin Short
        const mMax = await pool.query("SELECT MAX(date) as m FROM fm_margin_purchase_short_sale");
        const mDate = mMax.rows[0].m;
        if(mDate) {
            const mRes = await pool.query("SELECT COUNT(*) as c, SUM(pg_column_size(t.*)) as bytes FROM fm_margin_purchase_short_sale t WHERE date = $1", [mDate]);
            console.log(`Margin/Short (${mDate}):`, mRes.rows[0].c, "rows,", (mRes.rows[0].bytes / 1024 / 1024).toFixed(2), "MB");
        }
        
        // Institutional
        const iMax = await pool.query("SELECT MAX(date) as m FROM twse_institutional_investors");
        const iDate = iMax.rows[0].m;
        if(iDate) {
            const iRes = await pool.query("SELECT COUNT(*) as c, SUM(pg_column_size(t.*)) as bytes FROM twse_institutional_investors t WHERE date = $1", [iDate]);
            console.log(`Institutional (${iDate}):`, iRes.rows[0].c, "rows,", (iRes.rows[0].bytes / 1024 / 1024).toFixed(2), "MB");
        }

        // Daily Price
        const pMax = await pool.query("SELECT MAX(date) as m FROM daily_prices");
        const pDate = pMax.rows[0].m;
        if(pDate) {
            const pRes = await pool.query("SELECT COUNT(*) as c, SUM(pg_column_size(t.*)) as bytes FROM daily_prices t WHERE date = $1", [pDate]);
            console.log(`Daily Prices (${pDate}):`, pRes.rows[0].c, "rows,", (pRes.rows[0].bytes / 1024 / 1024).toFixed(2), "MB");
        }

    } catch(e) {
        console.error(e);
    }
}
run().finally(() => pool.end());
