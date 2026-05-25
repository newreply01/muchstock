const fetch = require('node-fetch');
const { pool } = require('./db');

async function syncCorpEvents() {
    console.log('🔄 [TWSE] Syncing corporate events (t187ap46_L)...');
    try {
        const res = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap46_L');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        
        console.log(`✅ [TWSE] Fetched ${data.length} corporate events. Sample:`, data[0]);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // clear old data if we want to just keep the latest, but let's just insert/update
            // wait, corp_events has columns: symbol, event_date, event_type, description, created_at
            // let's create table if not exists or check its schema
            await client.query(`
                CREATE TABLE IF NOT EXISTS corp_events (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(10) NOT NULL,
                    event_date DATE NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(symbol, event_date, event_type)
                );
            `);

            let count = 0;
            for (const item of data) {
                const symbol = item['公司代號'];
                if (!symbol || !/^\d{4}$/.test(symbol)) continue;
                
                // TWSE date format: 1130418 (民國113年4月18日)
                const dateStr = item['法說會日期'];
                if (!dateStr || dateStr.length < 7) continue;
                
                const year = parseInt(dateStr.substring(0, 3)) + 1911;
                const month = dateStr.substring(3, 5);
                const day = dateStr.substring(5, 7);
                const eventDate = `${year}-${month}-${day}`;
                
                const description = `法說會 (地點: ${item['法說會地點'] || '無'})`;
                
                await client.query(`
                    INSERT INTO corp_events (symbol, event_date, event_type, description)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (symbol, event_date, event_type) DO UPDATE SET
                        description = EXCLUDED.description
                `, [symbol, eventDate, '法說會', description]);
                count++;
            }
            await client.query('COMMIT');
            console.log(`✅ [TWSE] Successfully saved ${count} corporate events.`);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ [TWSE] Failed to sync corporate events:', err.message);
    }
}

if (require.main === module) {
    syncCorpEvents().then(() => process.exit(0));
}

module.exports = { syncCorpEvents };
