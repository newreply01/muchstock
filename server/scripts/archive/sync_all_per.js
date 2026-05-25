const { pool } = require('../db');
const { syncStockPER } = require('../finmind_fetcher');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runSync() {
    console.log("🚀 Starting incremental & prioritized sync for PE/PB history...");
    
    try {
        // 1. Get symbols prioritized by health_scores, skipping those already in fm_stock_per
        const res = await pool.query(`
            WITH unsynced_stocks AS (
                SELECT s.symbol, 
                       (SELECT 1 FROM stock_health_scores h WHERE h.symbol = s.symbol LIMIT 1) as has_health_score
                FROM stocks s
                WHERE s.symbol ~ '^[0-9]{4}$'
                AND s.symbol NOT IN (SELECT DISTINCT stock_id FROM fm_stock_per)
            )
            SELECT symbol FROM unsynced_stocks
            ORDER BY has_health_score DESC NULLS LAST, symbol ASC
        `);
        
        const stocks = res.rows;
        console.log(`📊 Found ${stocks.length} unsynced stocks to process.`);

        if (stocks.length === 0) {
            console.log("✨ All stocks are already synced. Nothing to do.");
            return;
        }

        for (let i = 0; i < stocks.length; i++) {
            const sym = stocks[i].symbol;
            process.stdout.write(`[${i + 1}/${stocks.length}] Processing ${sym}... `);
            
            try {
                // syncStockPER default starts from 2020-01-01
                await syncStockPER(sym);
                console.log('✅ Done');
            } catch (err) {
                console.log(`❌ Failed: ${err.message}`);
            }

            // Small delay to be safe with FinMind rate limits
            if (i < stocks.length - 1) {
                await sleep(1500); 
            }
        }

        console.log("\n✅ Global sync completed!");
    } catch (err) {
        console.error("\n❌ Fatal error during sync:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runSync();
