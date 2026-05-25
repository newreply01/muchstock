const { query, end } = require('../db');

async function verifyPartitions() {
    try {
        console.log('✅ 驗證 realtime_ticks 分區關係...');
        const res = await query(`
            SELECT nmsp_parent.nspname AS parent_schema, 
                   parent.relname AS parent_name, 
                   nmsp_child.nspname AS child_schema, 
                   child.relname AS child_name 
            FROM pg_inherits 
            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid 
            JOIN pg_class child ON pg_inherits.inhrelid = child.oid 
            JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace 
            JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace 
            WHERE parent.relname = 'realtime_ticks'
            ORDER BY child_name;
        `);
        
        if (res.rows.length > 0) {
            console.log(`🎊 成功！發現 ${res.rows.length} 個子分區：`);
            res.rows.forEach(r => console.log(`   - ${r.child_name}`));
        } else {
            console.log('❌ 失敗：未發現子分區。');
        }

    } catch (err) {
        console.error('❌ 驗證時出錯:', err.message);
    } finally {
        await end();
    }
}

verifyPartitions();
