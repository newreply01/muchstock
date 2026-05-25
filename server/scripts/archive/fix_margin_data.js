const { pool, query } = require('../db');

async function fixMarginData() {
    console.log('Starting margin data fix...');
    try {
        // Fix records where name is 'ShortSale' but value is in margin column
        const res = await query(`
            UPDATE fm_total_margin 
            SET short_sale_today_balance = margin_purchase_today_balance, 
                margin_purchase_today_balance = 0 
            WHERE (name = 'ShortSale' OR name = 'Short sale')
            AND margin_purchase_today_balance > 0
        `);
        console.log(`Updated ${res.rowCount} records.`);

        // Also check if we should aggregate some data manually or if the SUM in API is enough
        // Current API uses SUM grouped by date, which is perfect.

        console.log('Fix completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing margin data:', err);
        process.exit(1);
    }
}

fixMarginData();
