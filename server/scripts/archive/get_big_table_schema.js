const { query, end } = require('../db');

async function getBigTableSchema() {
    try {
        const tables = ['daily_prices', 'institutional'];
        for (const t of tables) {
            console.log(`\n🗝️ 查詢 ${t} 的主鍵與索引...`);
            
            const pkRes = await query(`
                SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
                FROM   pg_index i
                JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE  i.indrelid = '${t}'::regclass
                AND    i.indisprimary;
            `);
            console.log(`${t} Primary Key:`, JSON.stringify(pkRes.rows, null, 2));

            const idxRes = await query(`
                SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '${t}';
            `);
            console.log(`${t} Indexes:`, JSON.stringify(idxRes.rows, null, 2));
        }
    } catch (err) {
        console.error('❌ 查詢失敗:', err.message);
    } finally {
        await end();
    }
}

getBigTableSchema();
