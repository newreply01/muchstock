const { query, end } = require('../db');

/**
 * 將 2024 年以前的財報資料移至歷史分區
 */
async function migrateFinancials() {
    try {
        console.log('🔄 開始遷移歷史財報資料 (2017-2023)...');
        
        // 分年份遷移
        const years = ['2017', '2018', '2019', '2020', '2021', '2022', '2023'];
        
        for (const year of years) {
            console.log(`⏳ 處理 ${year} 年數據...`);
            
            // 1. 搬移資料
            const moveRes = await query(`
                INSERT INTO fm_financial_statements_history (stock_id, date, type, value, item)
                SELECT stock_id, date, type, value, item
                FROM fm_financial_statements
                WHERE date >= '${year}-01-01' AND date < '${parseInt(year)+1}-01-01'
            `);
            console.log(`   ✅ 已搬移 ${moveRes.rowCount} 筆。`);

            // 2. 刪除原表資料
            const delRes = await query(`
                DELETE FROM fm_financial_statements
                WHERE date >= '${year}-01-01' AND date < '${parseInt(year)+1}-01-01'
            `);
            console.log(`   🗑️ 原表已刪除 ${delRes.rowCount} 筆。`);
        }

        console.log('✨ 財報歸檔遷移完成！原表目前僅保留 2024-2025 年之熱資料。');

    } catch (err) {
        console.error('❌ 遷移失敗:', err.message);
    } finally {
        await end();
    }
}

migrateFinancials();
