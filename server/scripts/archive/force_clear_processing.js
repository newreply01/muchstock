const { pool } = require('../db');
(async () => {
    try {
        const res = await pool.query("UPDATE ai_generation_queue SET status = 'pending', start_at = NULL WHERE status = 'processing'");
        console.log(`✅ 已強制清理 ${res.rowCount} 筆幽靈任務狀態。`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
