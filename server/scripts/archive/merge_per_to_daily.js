const { query, end } = require('../db');

/**
 * 將 fm_stock_per 的數據併入 daily_prices
 */
async function mergePer() {
    try {
        console.log('🔄 開始將估值數據併入 daily_prices...');
        
        // 按日期分批處理
        const datesRes = await query(`
            SELECT DISTINCT date FROM fm_stock_per 
            ORDER BY date DESC
        `);
        
        console.log(`共計 ${datesRes.rows.length} 個交易日待合併。`);

        let totalUpdated = 0;
        for (const dateRow of datesRes.rows) {
            const syncDate = dateRow.date;
            const dateStr = new Date(syncDate).toISOString().split('T')[0];
            
            // 使用 UPDATE FROM 語法進行高效批次更新
            const updateRes = await query(`
                UPDATE daily_prices dp
                SET 
                    pe = s.pe_ratio::numeric,
                    pb = s.pb_ratio::numeric,
                    dividend_yield = s.dividend_yield::numeric
                FROM fm_stock_per s
                WHERE dp.symbol = s.stock_id 
                  AND dp.trade_date = s.date
                  AND s.date = $1
            `, [syncDate]);
            
            totalUpdated += updateRes.rowCount;
            if (updateRes.rowCount > 0 && totalUpdated % 10000 === 0) {
                console.log(`✅ 已更新至 ${dateStr}: 累計 ${totalUpdated} 筆。`);
            }
        }

        console.log(`✨ 合併完成！共計更新 ${totalUpdated} 筆估值數據至 daily_prices。`);

    } catch (err) {
        console.error('❌ 合併失敗:', err.message);
    } finally {
        await end();
    }
}

mergePer();
