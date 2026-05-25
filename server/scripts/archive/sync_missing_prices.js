const { query, end } = require('../db');

/**
 * 將 fm_stock_price 中缺失的數據補全至 daily_prices (分區表)
 */
async function syncPrices() {
    try {
        console.log('🔄 開始同步缺失的日K線數據...');
        
        // 1. 找出缺失的日期與個股組合
        const datesRes = await query(`
            SELECT DISTINCT date FROM fm_stock_price 
            WHERE NOT EXISTS (SELECT 1 FROM daily_prices dp WHERE dp.trade_date = fm_stock_price.date)
            ORDER BY date DESC
        `);
        
        console.log(`共計 ${datesRes.rows.length} 個交易日缺失資料。`);

        let totalInserted = 0;
        for (const dateRow of datesRes.rows) {
            const syncDate = dateRow.date;
            console.log(`⏳ 正在同步 ${new Date(syncDate).toISOString().split('T')[0]} ...`);
            
            const insertRes = await query(`
                INSERT INTO daily_prices (symbol, trade_date, open_price, high_price, low_price, close_price, volume, trade_value, transactions)
                SELECT 
                    stock_id, 
                    date, 
                    open::numeric, 
                    high::numeric, 
                    low::numeric, 
                    close::numeric, 
                    volume::bigint, 
                    trading_value::bigint, 
                    trading_turnover::integer
                FROM fm_stock_price
                WHERE date = $1
                ON CONFLICT (symbol, trade_date) DO NOTHING
            `, [syncDate]);
            
            totalInserted += insertRes.rowCount;
            console.log(`   ✅ 補入 ${insertRes.rowCount} 筆。`);
        }

        console.log(`✨ 同步完成！共計補入 ${totalInserted} 筆資料至 daily_prices。`);

    } catch (err) {
        console.error('❌ 同步失敗:', err.message);
    } finally {
        await end();
    }
}

syncPrices();
