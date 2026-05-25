const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT symbol, name FROM stocks WHERE symbol IN ('2025', '2026', '2027', '2024')");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
