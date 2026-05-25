const { query, end } = require('../db');

async function getTableInfo() {
    try {
        console.log('📊 正在查詢 realtime_ticks 的欄位結構...');
        const res = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'realtime_ticks'
            ORDER BY ordinal_position;
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n📈 正在查詢資料量分布 (by date)...');
        const countRes = await query(`
            SELECT trade_date, count(*) 
            FROM realtime_ticks 
            GROUP BY trade_date 
            ORDER BY trade_date DESC LIMIT 10;
        `);
        console.log(JSON.stringify(countRes.rows, null, 2));

    } catch (err) {
        console.error('❌ 查詢失敗:', err.message);
    } finally {
        await end();
    }
}

getTableInfo();
