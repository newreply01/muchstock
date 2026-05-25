const { query, end } = require('../db');
async function f() {
    try {
        console.log('📊 檢查歷史明細月份分佈...');
        const res = await query(`
            SELECT date_trunc('month', trade_time) as month, count(*) 
            FROM realtime_ticks_history 
            GROUP BY 1 
            ORDER BY 1
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
