const { query, end } = require('../db');
async function f() {
    try {
        const cols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fm_margin_trading'");
        console.log('Columns:', JSON.stringify(cols.rows, null, 2));
        const sample = await query("SELECT * FROM fm_margin_trading LIMIT 1");
        console.log('Sample:', JSON.stringify(sample.rows[0], null, 2));
        
        // 檢查 institutional 表
        const instCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'institutional'");
        console.log('Institutional Columns:', JSON.stringify(instCols.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
