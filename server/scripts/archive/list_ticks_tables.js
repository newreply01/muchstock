const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%realtime_ticks%' AND table_schema = 'public'");
        console.log(JSON.stringify(res.rows.map(r => r.table_name), null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
