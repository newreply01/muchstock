
const { query } = require('../db');
async function checkDefault() {
    try {
        const res = await query(`
            SELECT column_name, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'fm_total_margin'
        `);
        console.log('Defaults:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
checkDefault();
