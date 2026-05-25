const { query, end } = require('../db');
async function f() {
    try {
        console.log('🗑️ 正在刪除殘留表...');
        await query('DROP TABLE IF EXISTS realtime_ticks_old CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_old_backup CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_20 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_21 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_22 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_23 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_24 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_25 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_26 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_27 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_28 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_29 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_30 CASCADE');
        await query('DROP TABLE IF EXISTS realtime_ticks_2026_03_31 CASCADE');
        console.log('✅ 清理完成。');
    } catch (e) {
        console.error('❌ 清理出錯:', e.message);
    } finally {
        await end();
    }
}
f();
