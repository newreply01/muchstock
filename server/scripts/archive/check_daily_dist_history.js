const { query, end } = require('../db');
async function f() {
    try {
        console.log('📊 目前各交易日資料量：');
        const res = await query(`
            SELECT trade_time::date as d, count(*) 
            FROM realtime_ticks_history 
            GROUP BY 1 
            ORDER BY 1
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
