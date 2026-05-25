const { query, end } = require('../db');
async function f() {
    try {
        await query('TRUNCATE fm_stock_per');
        console.log('✅ TRUNCATED fm_stock_per');
    } catch (e) {
        console.error(e);
    } finally {
        await end();
    }
}
f();
