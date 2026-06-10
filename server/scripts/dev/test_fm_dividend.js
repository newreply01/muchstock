const { query } = require('./db');
async function run() {
    try {
        const res = await query("SELECT * FROM fm_dividend WHERE stock_id = '2330' ORDER BY date DESC LIMIT 5");
        console.log('2330 fm_dividend rows:', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
