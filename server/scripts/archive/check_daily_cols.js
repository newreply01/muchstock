const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_prices'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
