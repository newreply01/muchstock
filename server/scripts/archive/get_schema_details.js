const { query, end } = require('../db');

async function getDetailedSchema() {
    try {
        console.log('🗝️ 正在查詢 realtime_ticks 的主鍵與索引...');
        
        // 1. 查詢主鍵
        const pkRes = await query(`
            SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = 'realtime_ticks'::regclass
            AND    i.indisprimary;
        `);
        console.log('Primary Key:', JSON.stringify(pkRes.rows, null, 2));

        // 2. 查詢所有索引
        const idxRes = await query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'realtime_ticks';
        `);
        console.log('Indexes:', JSON.stringify(idxRes.rows, null, 2));

        // 3. 查詢外鍵依賴 (有沒有表連到它)
        const fkRes = await query(`
            SELECT conname, confrelid::regclass, contype
            FROM pg_constraint
            WHERE confrelid = 'realtime_ticks'::regclass;
        `);
        console.log('Foreign Key Dependencies:', JSON.stringify(fkRes.rows, null, 2));

    } catch (err) {
        console.error('❌ 查詢失敗:', err.message);
    } finally {
        await end();
    }
}

getDetailedSchema();
