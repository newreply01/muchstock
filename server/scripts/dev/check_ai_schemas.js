const { query } = require('./db');
async function checkSchemas() {
    const tables = ['institutional_2025', 'fundamentals', 'fm_margin_trading', 'fm_financial_statements', 'fm_broker_trading'];
    for (const table of tables) {
        try {
            const res = await query(`SELECT * FROM ${table} LIMIT 1`);
            console.log(`--- ${table} ---`);
            console.log(Object.keys(res.rows[0] || {}));
        } catch (e) {
            console.log(`--- ${table} (FAILED) ---`);
        }
    }
    process.exit(0);
}
checkSchemas();
