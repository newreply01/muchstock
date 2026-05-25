const { pool } = require('../db');

(async () => {
    console.log('--- 🛡️ 執行 AI 報告堆疊化移轉 (v4.0) ---');
    try {
        // 1. 檢查欄位是否存在，不存在則新增
        const colCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'ai_reports' AND column_name = 'report_date'
        `);

        if (colCheck.rows.length === 0) {
            console.log('🔹 正在新增 report_date 欄位...');
            await pool.query("ALTER TABLE ai_reports ADD COLUMN report_date DATE DEFAULT '2026-03-27'");
        }

        // 2. 移除舊的主鍵約束 (如有)
        // PostgreSQL 的主鍵約束名稱通常是 表名_pkey
        const pkCheck = await pool.query(`
            SELECT constraint_name FROM information_schema.table_constraints 
            WHERE table_name = 'ai_reports' AND constraint_type = 'PRIMARY KEY'
        `);

        if (pkCheck.rows.length > 0) {
            console.log(`🔹 正在移除舊主鍵: ${pkCheck.rows[0].constraint_name}...`);
            await pool.query(`ALTER TABLE ai_reports DROP CONSTRAINT ${pkCheck.rows[0].constraint_name}`);
        }

        // 3. 建立新的組合主鍵 (symbol, report_date)
        console.log('🔹 正在建立新的組合主鍵 (symbol, report_date)...');
        await pool.query('ALTER TABLE ai_reports ADD PRIMARY KEY (symbol, report_date)');

        console.log('✅ 資料庫移轉完成！AI 報告現在可每日堆疊。');
        process.exit(0);
    } catch (err) {
        if (err.code === '42P16') {
             console.log('ℹ️ 主鍵已存在，跳過建立。');
             process.exit(0);
        }
        console.error('❌ 移轉失敗:', err.message);
        process.exit(1);
    }
})();
