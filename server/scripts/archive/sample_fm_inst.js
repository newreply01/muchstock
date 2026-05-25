const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT * FROM fm_institutional LIMIT 5");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
