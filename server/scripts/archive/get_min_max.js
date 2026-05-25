const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT MIN(trade_time) as min_t, MAX(trade_time) as max_t FROM realtime_ticks");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
