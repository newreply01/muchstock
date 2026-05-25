const { query, end } = require('../db');
async function f() {
    try {
        console.log('🔍 正在搜尋財務相關表格...');
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%financial%' AND table_schema = 'public'
        `);
        console.log('發現表格:', res.rows.map(r => r.table_name));

        for (const t of res.rows) {
            const countRes = await query(`SELECT count(*) FROM ${t.table_name}`);
            console.log(`- ${t.table_name}: ${countRes.rows[0].count} 筆`);
        }
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
