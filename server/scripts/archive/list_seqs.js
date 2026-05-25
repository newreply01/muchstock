const { query, end } = require('../db');
async function f() {
    try {
        const res = await query("SELECT relname FROM pg_class WHERE relkind = 'S'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e.message); }
    finally { await end(); }
}
f();
