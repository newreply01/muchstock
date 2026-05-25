
const { query } = require('../db');
async function checkData() {
    try {
        const res = await query('SELECT * FROM fm_total_margin LIMIT 5');
        console.log('Sample Data:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
checkData();
