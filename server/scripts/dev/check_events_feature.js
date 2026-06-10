const { query } = require('./db');

async function checkEvents() {
    try {
        console.log('--- Checking corp_events table ---');
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'corp_events'
            );
        `);
        console.log('Table corp_events exists:', tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            const countCheck = await query('SELECT COUNT(*) FROM corp_events');
            console.log('Total rows in corp_events:', countCheck.rows[0].count);
            
            const sample = await query('SELECT * FROM corp_events LIMIT 5');
            console.log('Sample rows:', JSON.stringify(sample.rows, null, 2));
        }

        console.log('\n--- Checking dividend tables ---');
        const divPolicyCount = await query('SELECT COUNT(*) FROM dividend_policy');
        console.log('Total rows in dividend_policy:', divPolicyCount.rows[0].count);
        
        const fmDivCount = await query('SELECT COUNT(*) FROM fm_dividend');
        console.log('Total rows in fm_dividend:', fmDivCount.rows[0].count);

        const fmDivResultCount = await query('SELECT COUNT(*) FROM fm_dividend_result');
        console.log('Total rows in fm_dividend_result:', fmDivResultCount.rows[0].count);
        
        const divSample = await query("SELECT * FROM dividend_policy WHERE symbol = '2330' ORDER BY year DESC LIMIT 3");
        console.log('2330 Dividend Policy Sample:', JSON.stringify(divSample.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err.message);
        process.exit(1);
    }
}

checkEvents();
