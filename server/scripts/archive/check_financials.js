const { query, end } = require('../db');
async function f() {
    try {
        const cols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'fm_financial_statements'");
        console.log('Columns:', JSON.stringify(cols.rows, null, 2));
        const sample = await query("SELECT * FROM fm_financial_statements ORDER BY date DESC LIMIT 1");
        console.log('Sample:', JSON.stringify(sample.rows[0], null, 2));
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
