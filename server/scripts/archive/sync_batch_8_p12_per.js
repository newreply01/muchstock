const { syncStockPER } = require('../finmind_fetcher');
const { pool } = require('../db');

const symbols = [
    '1210', '4746', '6226', '2395', '1712', '6446', '3653', '6176', '7780', '5519', 
    '2101', '5309', '6757', '3591', '2388', '3031', '4739', '5371', '3042', '6206', 
    '6761', '1905', '2413', '3363', '3034', '2453', '3060', '3704', '3032', '3317'
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runSync() {
    console.log(`🚀 Starting targeted PE/PB sync for ${symbols.length} symbols (Batch 8 Part 12)...`);
    
    for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        console.log(`[${i + 1}/${symbols.length}] Syncing ${sym}...`);
        
        try {
            await syncStockPER(sym);
        } catch (err) {
            console.error(`❌ Failed to sync ${sym}:`, err.message);
        }

        // Delay to respect rate limits (600 calls/hr = 1 call / 6s, but we usually have multiple tokens or higher limits if using raw fetcher)
        // finmind_fetcher has rotate logic, but 1s delay is safe.
        if (i < symbols.length - 1) {
            await sleep(1000); 
        }
    }

    console.log("✅ Targeted sync completed!");
    pool.end();
}

runSync();
