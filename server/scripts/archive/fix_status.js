const { query, end } = require('../db');

async function fixStatus() {
    try {
        console.log('🔍 正在檢查資料庫中的服務狀態...');
        
        // 1. 查找所有狀態為 RUNNING 且超過 1 小時未更新的紀錄
        const staleRes = await query(`
            SELECT service_name, status, check_time 
            FROM (
                SELECT DISTINCT ON (service_name) service_name, status, check_time 
                FROM system_status 
                ORDER BY service_name, check_time DESC
            ) latest 
            WHERE status = 'RUNNING' AND check_time < NOW() - INTERVAL '1 hour'
        `);
        
        if (staleRes.rows.length === 0) {
            console.log('✅ 未發現過期的 RUNNING 狀態。');
        } else {
            for (const row of staleRes.rows) {
                console.log(`⚠️ 發現過期任務: ${row.service_name} (上次更新: ${row.check_time})`);
                await query(
                    "INSERT INTO system_status (service_name, status, message) VALUES ($1, $2, $3)",
                    [row.service_name, 'STALE', '檢測到長時間未更新，標記為過期']
                );
            }
            console.log(`🚀 已修正 ${staleRes.rows.length} 項狀態。`);
        }

        // 2. 特殊處理：剛才手動跑成功的技術指標腳本，幫它寫入一筆 SUCCESS
        console.log('📝 為 calculate_indicators.js 寫入最新的成功狀態...');
        await query(
            "INSERT INTO system_status (service_name, status, message) VALUES ($1, $2, $3)",
            ['calculate_indicators.js', 'SUCCESS', '手動修復後執行成功']
        );

    } catch (err) {
        console.error('❌ 修正狀態時出錯:', err);
    } finally {
        await end();
    }
}

fixStatus();
