const { query, end } = require('../db');
async function f() {
    try {
        console.log('📊 正在查詢資料庫中的大表資料量...');
        const res = await query(`
            SELECT table_name, 
                   (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text::bigint as row_count
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY row_count DESC;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error('❌ 查詢失敗:', e.message); }
    finally { await end(); }
}
f();
