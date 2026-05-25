const { query, end } = require('../db');

async function checkExistingPartitions() {
    try {
        const tables = ['daily_prices', 'institutional'];
        for (const parent of tables) {
            console.log(`\n🔍 檢查 ${parent} 的分區狀態...`);
            const res = await query(`
                SELECT child.relname AS child_name 
                FROM pg_inherits 
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid 
                JOIN pg_class child ON pg_inherits.inhrelid = child.oid 
                WHERE parent.relname = '${parent}';
            `);
            
            if (res.rows.length > 0) {
                console.log(`发现了 ${res.rows.length} 個分區：`);
                res.rows.forEach(r => console.log(`   - ${r.child_name}`));
            } else {
                console.log('ℹ️ 此表目前不是分區主表。');
            }
        }
    } catch (err) {
        console.error('❌ 失敗:', err.message);
    } finally {
        await end();
    }
}

checkExistingPartitions();
