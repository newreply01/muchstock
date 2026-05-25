const { pool } = require('../db');
(async () => {
    try {
        const res = await pool.query(`
            SELECT model_name, status, count(*) as count
            FROM ai_generation_queue 
            WHERE report_date = (SELECT MAX(report_date) FROM ai_generation_queue)
            GROUP BY model_name, status
            ORDER BY model_name, status
        `);
        console.log('--- AI 任務目前 [模型與狀態] 分佈統計 ---');
        console.table(res.rows);

        const current = await pool.query(`
            SELECT symbol, report_date, model_name, status, start_at FROM ai_generation_queue 
            WHERE status = 'processing' 
            ORDER BY start_at DESC LIMIT 5
        `);
        console.log('--- 正在處理中的標的與其使用模型 ---');
        console.table(current.rows);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
