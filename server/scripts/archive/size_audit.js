const { query, end } = require('../db');

async function audit() {
    try {
        console.log('📊 正在進行詳細資料庫審計...');
        
        const res = await query(`
            SELECT 
                relname as table_name,
                n_live_tup as row_count,
                pg_size_pretty(pg_total_relation_size(relid)) as total_size,
                pg_total_relation_size(relid) as size_bytes
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(relid) DESC;
        `);

        const inventory = [];
        for (const row of res.rows) {
            let reason = '';
            if (row.row_count === '0') {
                // 判斷空表原因
                if (row.table_name.startsWith('realtime_ticks_2026')) {
                    reason = '先前「每日分區」遺留的空分區殼，目前已改用按月分區。';
                } else if (row.table_name === 'realtime_ticks_old') {
                    reason = '遷移至歷史分區後的殘留表。';
                } else if (row.table_name === 'stock_daily_analysis_results') {
                    reason = '分析任務尚未執行。';
                } else {
                    reason = '尚未導入資料或任務未觸發。';
                }
            }

            inventory.push({
                name: row.table_name,
                rows: parseInt(row.row_count),
                size: row.total_size,
                bytes: parseInt(row.size_bytes),
                reason: reason
            });
        }

        console.log(JSON.stringify(inventory, null, 2));

    } catch (err) {
        console.error('❌ 審計失敗:', err);
    } finally {
        await end();
    }
}

audit();
