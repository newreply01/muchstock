const { query } = require('./db');
async function run() {
    try {
        console.log('--- Table: realtime_ticks ---');
        const res = await query("SELECT created_at, trade_time FROM realtime_ticks ORDER BY trade_time DESC LIMIT 1");
        console.log('Latest trade_time:', JSON.stringify(res.rows, null, 2));
        
        const countRes = await query("SELECT COUNT(*) FROM realtime_ticks");
        console.log('Row count:', countRes.rows[0].count);

        const indices = await query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'realtime_ticks'");
        console.log('Indices:', JSON.stringify(indices.rows, null, 2));

        console.log('\n--- Table: daily_prices ---');
        const res2 = await query("SELECT trade_date FROM daily_prices ORDER BY trade_date DESC LIMIT 1");
        console.log('Latest trade_date:', JSON.stringify(res2.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
