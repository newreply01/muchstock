const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT * FROM fm_stock_price WHERE date = '2024-09-25T16:00:00.000Z' LIMIT 5");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await end();
    }
}
f();
