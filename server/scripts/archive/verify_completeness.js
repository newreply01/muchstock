const { query, end } = require('../db');
async function f() {
    try {
        const date = '2026-03-19';
        console.log(`📊 檢查 ${date} 的資料完備性：`);
        
        const dpCount = await query("SELECT count(distinct symbol) FROM daily_prices WHERE trade_date = $1", [date]);
        const tickCount = await query("SELECT count(distinct symbol) FROM realtime_ticks_history WHERE trade_time::date = $1", [date]);
        
        console.log(`daily_prices 股票數: ${dpCount.rows[0].count}`);
        console.log(`realtime_ticks_history 股票數: ${tickCount.rows[0].count}`);

        const sample = await query(`
            SELECT symbol, count(*) 
            FROM realtime_ticks_history 
            WHERE trade_time::date = $1 
            GROUP BY 1 
            LIMIT 5
        `, [date]);
        console.log('股票成交明細筆數範例:', JSON.stringify(sample.rows, null, 2));

    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
