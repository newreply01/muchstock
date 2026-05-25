const { query, end } = require('../db');
async function f() {
    try {
        console.log('📊 正在查詢 fm_* 暫存表的資料量...');
        const res = await query(`
            SELECT table_name, 
                   (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text::bigint as rows
            FROM information_schema.tables
            WHERE table_name LIKE 'fm_%'
            ORDER BY rows DESC;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
