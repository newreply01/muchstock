const { query, end } = require('../db');

async function checkDataDistribution() {
    try {
        const tables = ['daily_prices', 'institutional'];
        for (const t of tables) {
            console.log(`\n📊 ${t} 資料分布情況 (按分區)：`);
            const res = await query(`
                SELECT table_name, 
                       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text::bigint as rows
                FROM information_schema.tables
                WHERE table_name LIKE '${t}_20%'
                ORDER BY table_name;
            `);
            console.log(JSON.stringify(res.rows, null, 2));
        }
    } catch (err) {
        console.error('❌ 失敗:', err.message);
    } finally {
        await end();
    }
}

checkDataDistribution();
