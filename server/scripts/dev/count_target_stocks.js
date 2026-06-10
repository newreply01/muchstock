const { query } = require('./db');
async function run() {
    const res = await query("SELECT count(*) FROM stocks WHERE symbol ~ '^\\d{4}$' OR symbol ~ '^00\\d{4}$'");
    console.log('Target Stocks Count:', res.rows[0].count);
    const total = await query("SELECT count(*) FROM stocks");
    console.log('Total Stocks in DB:', total.rows[0].count);
    process.exit(0);
}
run();
