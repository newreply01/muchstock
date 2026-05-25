const { query, end } = require('../db');

async function fullInventory() {
    try {
        console.log('🔍 正在盤點全系統資料表...');
        
        // 1. 取得所有資料表名稱與欄位量
        const tablesRes = await query(`
            SELECT table_name, 
                   (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        
        const inventory = [];
        
        for (const t of tablesRes.rows) {
            process.stdout.write(`   - 處理 ${t.table_name}... `);
            try {
                // 2. 隨機取樣一筆資料，看看內容
                const sampleRes = await query(`SELECT * FROM ${t.table_name} LIMIT 1`);
                
                // 3. 取得日期範圍 (如果有的話)
                let dateRange = 'N/A';
                const dateCols = ['trade_date', 'date', 'created_at', 'trade_time'];
                const sampleCols = Object.keys(sampleRes.rows[0] || {});
                const dateCol = dateCols.find(c => sampleCols.includes(c));
                
                if (dateCol) {
                    const rangeRes = await query(`SELECT MIN(${dateCol}) as min_d, MAX(${dateCol}) as max_d FROM ${t.table_name}`);
                    dateRange = `${rangeRes.rows[0].min_d} ~ ${rangeRes.rows[0].max_d}`;
                }

                // 4. 計算筆數 (準確)
                const countRes = await query(`SELECT count(*) FROM ${t.table_name}`);
                
                inventory.push({
                    table: t.table_name,
                    rows: countRes.rows[0].count,
                    cols: t.column_count,
                    range: dateRange,
                    sample: sampleRes.rows[0] ? JSON.stringify(sampleRes.rows[0]).substring(0, 100) + '...' : 'Empty'
                });
                console.log('完成。');
            } catch (err) {
                console.log(`跳過 (${err.message})`);
            }
        }
        
        console.log('\n--- 盤點報告 ---');
        console.log(JSON.stringify(inventory, null, 2));

    } catch (err) {
        console.error('❌ 盤點失敗:', err);
    } finally {
        await end();
    }
}

fullInventory();
