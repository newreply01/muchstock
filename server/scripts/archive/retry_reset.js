const { pool } = require('../db');
(async () => {
    try {
        const res = await pool.query(`
            UPDATE ai_generation_queue 
            SET status = 'pending', retry_count = 0, error_msg = NULL 
            WHERE status = 'failed'
        `);
        console.log(`✅ 已成功重置 ${res.rowCount} 筆失敗任務，準備重新排隊。`);
        process.exit(0);
    } catch (err) {
        console.error('重置失敗:', err);
        process.exit(1);
    }
})();
