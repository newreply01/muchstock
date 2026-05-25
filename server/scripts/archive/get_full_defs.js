const { query, end } = require('../db');

async function getFullDefinitions() {
    try {
        console.log('📋 正在下載完整欄位定義...');
        const res = await query(`
            SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'realtime_ticks'
            ORDER BY ordinal_position;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('❌ 失敗:', err.message);
    } finally {
        await end();
    }
}

getFullDefinitions();
