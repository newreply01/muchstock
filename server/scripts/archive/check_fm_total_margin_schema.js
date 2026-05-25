
const { query } = require('../db');
async function checkSchema() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fm_total_margin'
        `);
        console.log('Columns:', JSON.stringify(res.rows, null, 2));

        const constRes = await query(`
            SELECT conname, contype 
            FROM pg_constraint 
            WHERE conrelid = 'fm_total_margin'::regclass
        `);
        console.log('Constraints:', JSON.stringify(constRes.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
checkSchema();
