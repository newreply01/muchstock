const { query } = require('./db');
async function run() {
    try {
        const totalUniverse = await query(`
            SELECT COUNT(*) 
            FROM stocks 
            WHERE (symbol ~ '^[0-9]{4}$' OR symbol ~ '^[0-9]{5,6}$')
        `);
        console.log('Total relevant stocks in stocks table:', totalUniverse.rows[0].count);

        const inSnapshot = await query(`
            SELECT COUNT(*) 
            FROM stocks s
            JOIN snapshot_last_close sn ON s.symbol = sn.symbol
            WHERE (s.symbol ~ '^[0-9]{4}$' OR s.symbol ~ '^[0-9]{5,6}$')
        `);
        console.log('Relevant stocks WITH snapshot data:', inSnapshot.rows[0].count);

        const missingSnapshot = await query(`
            SELECT symbol, name 
            FROM stocks s
            WHERE (s.symbol ~ '^[0-9]{4}$' OR s.symbol ~ '^[0-9]{5,6}$')
            AND NOT EXISTS (SELECT 1 FROM snapshot_last_close sn WHERE sn.symbol = s.symbol)
            LIMIT 10
        `);
        console.log('Sample stocks MISSING snapshot data:', JSON.stringify(missingSnapshot.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
