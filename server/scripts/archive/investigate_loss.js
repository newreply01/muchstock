const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT MIN(trade_time), MAX(trade_time) FROM realtime_ticks_history");
        console.log('現有資料範圍:', JSON.stringify(res.rows[0]));
        
        const allTables = await query("SELECT relname FROM pg_class WHERE relkind='r' AND relname LIKE '%ticks%'");
        console.log('當前資料庫中所有 Tick 相關表:', allTables.rows.map(r => r.relname));

    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
