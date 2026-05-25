
const { query } = require('../db');
async function checkPK() {
    try {
        const res = await query(`
            SELECT a.attname 
            FROM pg_index i 
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) 
            WHERE i.indrelid = 'fm_total_margin'::regclass 
            AND i.indisprimary
        `);
        console.log('PK Columns:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
checkPK();
