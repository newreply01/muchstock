const { query } = require('./db');
async function run() {
    try {
        const date = "2026-03-12";
        
        const rtSymbols = await query(`
            SELECT COUNT(DISTINCT symbol) as count 
            FROM realtime_ticks 
            WHERE (trade_time AT TIME ZONE 'Asia/Taipei')::date = $1
        `, [date]);
        console.log(`Unique symbols in realtime_ticks for ${date}:`, rtSymbols.rows[0].count);

        const snapshotCount = await query(`SELECT COUNT(*) as count FROM snapshot_last_close`);
        console.log(`Total symbols in snapshot_last_close:`, snapshotCount.rows[0].count);

        const joinedCount = await query(`
            SELECT COUNT(DISTINCT t.symbol) as count
            FROM realtime_ticks t
            JOIN snapshot_last_close sn ON t.symbol = sn.symbol
            WHERE (t.trade_time AT TIME ZONE 'Asia/Taipei')::date = $1
        `, [date]);
        console.log(`Unique symbols in BOTH for ${date}:`, joinedCount.rows[0].count);

        const totalStocks = await query(`SELECT COUNT(*) as count FROM stocks WHERE symbol ~ '^[0-9]{4}$' OR symbol ~ '^[0-9]{5,6}$'`);
        console.log(`Total relevant stocks/ETFs in 'stocks' table:`, totalStocks.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
