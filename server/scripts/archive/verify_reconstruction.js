const { query, end } = require('../db');

async function v() {
    try {
        console.log('🔍 正在詳細驗證重構結果...');
        
        // 1. 檢查分區
        const partitions = await query(`
            SELECT nmsp_parent.nspname AS parent_schema,
                   parent.relname      AS parent_name,
                   nmsp_child.nspname  AS child_schema,
                   child.relname       AS child_name
            FROM pg_inherits
            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
            JOIN pg_class child ON pg_inherits.inhrelid = child.oid
            JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
            JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
            WHERE parent.relname = 'realtime_ticks_history'
        `);
        console.log('當前分區:', partitions.rows.map(r => r.child_name));

        // 2. 檢查總筆數
        const total = await query("SELECT count(*) FROM realtime_ticks_history");
        console.log('歷史表總筆數:', total.rows[0].count);

        // 3. 檢查當日表
        const todayCount = await query("SELECT count(*) FROM realtime_ticks");
        console.log('當日表筆數:', todayCount.rows[0].count);

        // 4. 如果筆數不對，嘗試找出舊表殘留 (如果有)
        const oldCheck = await query("SELECT table_name FROM information_schema.tables WHERE table_name = 'realtime_ticks_history_old'");
        if (oldCheck.rows.length > 0) {
            const oldCount = await query("SELECT count(*) FROM realtime_ticks_history_old");
            console.log('⚠️ 警告：舊表依然存在，筆數為:', oldCount.rows[0].count);
        }

    } catch (e) {
        console.error('❌ 驗證失敗:', e.message);
    } finally {
        await end();
    }
}
v();
