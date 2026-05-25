const { query, end } = require('../db');
async function f() {
    try {
        const fmCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fm_institutional'");
        const instCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'institutional'");
        console.log('fm_institutional:', fmCols.rows.map(r => r.column_name).join(', '));
        console.log('institutional:', instCols.rows.map(r => r.column_name).join(', '));
        
        const fmPriceCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fm_stock_price'");
        const dpCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_prices'");
        console.log('fm_stock_price:', fmPriceCols.rows.map(r => r.column_name).join(', '));
        console.log('daily_prices:', dpCols.rows.map(r => r.column_name).join(', '));

    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
