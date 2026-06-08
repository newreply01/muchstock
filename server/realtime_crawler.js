const { query, pool } = require('./db');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 安全檢查：僅在明確啟用爬蟲的環境中執行 (例如本地 WSL)
// 避免在 Zeabur 或其他雲端平台中誤啟動
if (process.env.ENABLE_CRAWLER !== 'true') {
    console.log('[Realtime Crawler] ENABLE_CRAWLER env var not set to true. Exiting safely...');
    process.exit(0);
}

const fetchJson = (url, timeout = 15000) => new Promise((resolve, reject) => {
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://mis.twse.com.tw/stock/index.jsp'
        },
        timeout: timeout
    };
    const req = https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try { 
                if (!data) return resolve({});
                resolve(JSON.parse(data)); 
            } catch (e) { 
                reject(new Error(`JSON Parse Error: ${e.message}`)); 
            }
        });
    });
    req.on('error', reject);
    req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request Timeout'));
    });
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function logCrawlerStatus(status, message) {
    try {
        await pool.query(
            `INSERT INTO system_status (service_name, status, message) VALUES ($1, $2, $3)`,
            ['realtime_crawler.js', status, message]
        );
    } catch (err) {
        console.error(`Failed to log crawler status:`, err.message);
    }
}

async function getTargetSymbols() {
    try {
        const res = await query(`
            SELECT symbol, market FROM stocks 
            WHERE symbol ~ '^(\\d{4}|00\\d{3,4})$'
               OR symbol = 'TAIEX'
        `);
        const symbols = res.rows.map(r => ({
            symbol: r.symbol,
            market: r.market,
            prefix: r.symbol === 'TAIEX' ? 'tse' : (r.market === 'twse' ? 'tse' : 'otc'),
            apiSymbol: r.symbol === 'TAIEX' ? 't00' : r.symbol
        }));
        console.log(`[Crawler] Target symbols count: ${symbols.length} (Smart filter: Included ETFs/ETNs/TAIEX, Excluded Warrants)`);
        return symbols;
    } catch (err) {
        console.error(`[Crawler] Failed to get target symbols:`, err.message);
        return [];
    }
}

function parseFiveLevels(pricesStr, volsStr) {
    if (!pricesStr || !volsStr) return [];
    const prices = pricesStr.split('_').filter(Boolean);
    const vols = volsStr.split('_').filter(Boolean);
    return prices.map((p, i) => ({
        price: p === '-' ? null : parseFloat(p),
        volume: vols[i] ? parseInt(vols[i]) : 0
    })).filter(level => level.price !== null);
}

const BATCH_SIZE = 100; // 降低批次大小，提升 API 穩定性與回傳成功率
const DELAY_BETWEEN_BATCHES_MS = 1000;
const RETRY_DELAY = 10000;

let cachedSymbols = null;
let lastSymbolsUpdate = 0;
const SYMBOLS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function getTargetSymbolsCached() {
    const now = Date.now();
    if (cachedSymbols && (now - lastSymbolsUpdate < SYMBOLS_CACHE_DURATION)) {
        return cachedSymbols;
    }
    cachedSymbols = await getTargetSymbols();
    lastSymbolsUpdate = now;
    return cachedSymbols;
}

/**
 * 批量更新 (Bulk Upsert)
 * 使用 PostgreSQL 的 UNNEST 功能，一次性更新多筆資料，大幅減少 DB round-trips
 */
async function bulkUpsert(data) {
    if (!data || data.length === 0) return 0;

    const symbols = data.map(d => d.symbol);
    const tradeTimes = data.map(d => d.tradeTime);
    const prices = data.map(d => d.price);
    const openPrices = data.map(d => d.open);
    const highPrices = data.map(d => d.high);
    const lowPrices = data.map(d => d.low);
    const volumes = data.map(d => d.volume);
    const tradeVolumes = data.map(d => d.tradeVolume);
    const buyIntensities = data.map(d => d.buyIntensity);
    const sellIntensities = data.map(d => d.sellIntensity);
    const fiveLevels = data.map(d => JSON.stringify(d.fiveLevels));
    const previousCloses = data.map(d => d.previousClose);

    const sql = `
        INSERT INTO realtime_ticks (
            symbol, trade_time, price, open_price, high_price, low_price, 
            volume, trade_volume, buy_intensity, sell_intensity, five_levels,
            previous_close
        )
        SELECT * FROM UNNEST(
            $1::text[], $2::timestamp[], $3::numeric[], $4::numeric[], $5::numeric[], $6::numeric[],
            $7::bigint[], $8::bigint[], $9::smallint[], $10::smallint[], $11::jsonb[], $12::numeric[]
        )
        ON CONFLICT (symbol, trade_time) DO UPDATE SET
            price = EXCLUDED.price,
            open_price = COALESCE(EXCLUDED.open_price, realtime_ticks.open_price),
            high_price = EXCLUDED.high_price,
            low_price = EXCLUDED.low_price,
            volume = EXCLUDED.volume,
            trade_volume = EXCLUDED.trade_volume,
            buy_intensity = EXCLUDED.buy_intensity,
            sell_intensity = EXCLUDED.sell_intensity,
            five_levels = EXCLUDED.five_levels,
            previous_close = COALESCE(EXCLUDED.previous_close, realtime_ticks.previous_close)
    `;

    try {
        const res = await query(sql, [
            symbols, tradeTimes, prices, openPrices, highPrices, lowPrices,
            volumes, tradeVolumes, buyIntensities, sellIntensities, fiveLevels, previousCloses
        ]);
        
        // Notify the API server that new realtime data is available
        await query(`NOTIFY realtime_update, 'new_ticks'`);
        
        return res.rowCount || data.length;
    } catch (err) {
        console.error(`[Bulk Upsert Error] Batch failed: ${err.message}`);
        // 如果 Batch 失敗，可考慮退回到逐筆寫入以除錯，但此處先保持簡潔
        throw err;
    }
}

async function fetchBatch(batchStr, retries = 2) {
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${batchStr}&json=1&delay=0&_=${Date.now()}`;
    for (let i = 0; i <= retries; i++) {
        try {
            const data = await fetchJson(url);
            if (data?.msgArray) return data.msgArray;
            if (data?.rtcode === 'refer') {
                console.warn('[Fetch] Session error, retrying...');
                await sleep(1000);
                continue;
            }
            return [];
        } catch (e) {
            console.error(`[Fetch Attempt ${i+1}] Error: ${e.message}`);
            if (i < retries) await sleep(2000);
        }
    }
    return [];
}

/**
 * 解析成交價，當 z 為 "-" 時使用買賣價回退機制
 * @returns {{ price: number|null, source: string }}
 */
function resolvePrice(info) {
    // 1. 優先使用即時成交價 z
    if (info.z && info.z !== '-') {
        const p = parseFloat(info.z);
        if (!isNaN(p) && p > 0) return { price: p, source: 'z' };
    }

    // 2. 回退：使用最佳賣價 (ask[0]) 與最佳買價 (bid[0]) 的中間價
    const asks = info.a ? info.a.split('_').filter(Boolean) : [];
    const bids = info.b ? info.b.split('_').filter(Boolean) : [];
    const bestAsk = asks.length > 0 && asks[0] !== '-' ? parseFloat(asks[0]) : null;
    const bestBid = bids.length > 0 && bids[0] !== '-' ? parseFloat(bids[0]) : null;

    if (bestAsk && bestBid) {
        return { price: parseFloat(((bestAsk + bestBid) / 2).toFixed(2)), source: 'mid' };
    }
    if (bestAsk) return { price: bestAsk, source: 'ask' };
    if (bestBid) return { price: bestBid, source: 'bid' };

    // 3. 最後回退：使用昨收價 y
    if (info.y && info.y !== '-') {
        const yp = parseFloat(info.y);
        if (!isNaN(yp) && yp > 0) return { price: yp, source: 'y' };
    }

    return { price: null, source: 'none' };
}

async function startCrawler() {
    console.log(`[Realtime Crawler] Started. Checking market hours...`);
    
    // 初始化追蹤變數，避免重啟時誤刪資料
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    let lastClearedDate = '';
    let lastMigratedDate = '';

    try {
        // 檢查今天是否已經清盤過 (看 Hot Table 是否有今日以前的殘留資料)
        const checkClearRes = await query(`SELECT 1 FROM realtime_ticks WHERE DATE(trade_time) < $1::date LIMIT 1`, [todayStr]);
        if (checkClearRes.rows.length === 0) {
            // 如果沒看到舊資料，或是本來就空，假設今日已清
            lastClearedDate = todayStr;
        }

        // 檢查今天是否已經搬移過 (看 Cold Table 是否存有今日資料)
        const checkMigrateRes = await query(`SELECT 1 FROM realtime_ticks_history WHERE DATE(trade_time) = $1::date LIMIT 1`, [todayStr]);
        if (checkMigrateRes.rows.length > 0) {
            lastMigratedDate = todayStr;
        }
        
        console.log(`[Maintenance] Init: lastClearedDate=${lastClearedDate}, lastMigratedDate=${lastMigratedDate}`);
    } catch (err) {
        console.error(`[Maintenance] Init failed: ${err.message}`);
    }

    while (true) {
        const now = new Date();
        const tpeTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
        const currentToday = tpeTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        const day = tpeTime.getDay();
        const hours = tpeTime.getHours();
        const minutes = tpeTime.getMinutes();
        const isWeekday = day >= 1 && day <= 5;

        const timeInMinutes = hours * 60 + minutes;
        const marketOpen = 8 * 60 + 50;   // 08:50
        const marketClose = 13 * 60 + 40;  // 13:40
        const migrationTime = 13 * 60 + 45; // 13:45 執行資料搬移

        // --- 每日維護邏輯 ---

        // 1. 開盤前清理 (Hot Table)
        if (timeInMinutes >= marketOpen && timeInMinutes <= marketClose && todayStr !== lastClearedDate) {
            console.log(`[Maintenance] New trading day ${todayStr}. Clearing hot table...`);
            try {
                await query('DELETE FROM realtime_ticks WHERE trade_time < $1::date', [todayStr]);
                lastClearedDate = todayStr;
                console.log(`[Maintenance] Hot table cleared (old data deleted).`);
            } catch (err) {
                console.error(`[Maintenance] Clear failed: ${err.message}`);
            }
        }

        // 2. 收盤後搬移 (Hot -> Cold)
        if (timeInMinutes >= migrationTime && currentToday !== lastMigratedDate) {
            console.log(`[Maintenance] Market closed. Migrating today's ticks to history...`);
            try {
                // 將當日資料複製到歷史表
                await query(`
                    INSERT INTO realtime_ticks_history 
                    (symbol, trade_time, price, open_price, high_price, low_price, volume, trade_volume, buy_intensity, sell_intensity, five_levels, previous_close)
                    SELECT symbol, trade_time, price, open_price, high_price, low_price, volume, trade_volume, buy_intensity, sell_intensity, five_levels, previous_close
                    FROM realtime_ticks
                `);
                lastMigratedDate = currentToday;
                console.log(`[Maintenance] Migration to history complete. Data remains in Hot Table for after-hours viewing.`);

                // Vercel 專屬優化：冷表只留 3 天
                if (process.env.VERCEL === '1') {
                    console.log(`[Vercel Optimization] Cleaning up cold table (retention: 3 days)...`);
                    try {
                        await query(`DELETE FROM realtime_ticks_history WHERE trade_time < NOW() - INTERVAL '3 days'`);
                        console.log(`[Vercel Optimization] Cold table cleanup complete.`);

                        // 軌跡紀錄清理：只留 3 天
                        await query(`DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '3 days'`);
                        console.log(`[Vercel Optimization] Audit logs cleanup complete.`);
                    } catch (err) {
                        console.error(`[Vercel Optimization] Cleanup failed: ${err.message}`);
                    }
                }
            } catch (err) {
                console.error(`[Maintenance] Migration failed: ${err.message}`);
            }
        }

        // --- 爬蟲執行邏輯 ---
        if (!isWeekday || timeInMinutes < marketOpen || timeInMinutes > marketClose) {
            console.log(`[Market Closed] Sleeping...`);
            await logCrawlerStatus('WAITING', '休市中，等待開盤');
            await sleep(60000); // Sleep 1 minute
            continue;
        }

        console.log(`[${tpeTime.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' })}] Market is OPEN. Fetching full market...`);
        await logCrawlerStatus('RUNNING', '開盤中，持續擷取即時報價...');
        const symbols = await getTargetSymbolsCached();
        console.log(`Total symbols to fetch: ${symbols.length}`);

        let totalUpserted = 0;
        let fallbackCount = 0;

        for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
            const batch = symbols.slice(i, i + BATCH_SIZE);
            const batchStr = batch.map(s => `${s.prefix}_${s.apiSymbol}.tw`).join('|');

            const results = await fetchBatch(batchStr);
            const batchData = [];

            for (const info of results) {
                const { price: resolvedPrice, source: priceSource } = resolvePrice(info);
                if (resolvedPrice === null) continue;

                if (priceSource !== 'z') fallbackCount++;

                const symbol = info.c === 't00' ? 'TAIEX' : info.c;
                const o = (info.o && info.o !== '-') ? parseFloat(info.o) : resolvedPrice;
                const h = (info.h && info.h !== '-') ? parseFloat(info.h) : resolvedPrice;
                const l = (info.l && info.l !== '-') ? parseFloat(info.l) : resolvedPrice;
                const y = (info.y && info.y !== '-') ? parseFloat(info.y) : null;
                const v = parseInt(info.v) || 0;
                const tv = parseInt(info.tv) || 0;

                const bids = parseFiveLevels(info.b, info.g);
                const asks = parseFiveLevels(info.a, info.f);
                const bidAskData = [];
                for (let k = 0; k < 5; k++) {
                    if (bids[k] || asks[k]) {
                        bidAskData.push({
                            bid: bids[k]?.price || null,
                            bVol: bids[k]?.volume || null,
                            ask: asks[k]?.price || null,
                            aVol: asks[k]?.volume || null
                        });
                    }
                }

                let buyIntensity = 50, sellIntensity = 50;
                if (asks.length > 0 && bids.length > 0 && resolvedPrice) {
                    if (resolvedPrice >= asks[0].price) { buyIntensity = 65; sellIntensity = 35; }
                    else if (resolvedPrice <= bids[0].price) { buyIntensity = 35; sellIntensity = 65; }
                }

                let tradeTimeStr = info.t;
                if (tradeTimeStr) {
                    if (tradeTimeStr.indexOf(':') !== -1) {
                        // Keep exact HH:MM:SS, no longer truncate to :00
                        tradeTimeStr = tradeTimeStr.substring(0, 8);
                    } else {
                        // raw 數字 (HHMMSS)，補齊 6 碼再切割並保留秒數
                        const paddedTime = tradeTimeStr.padStart(6, '0');
                        tradeTimeStr = `${paddedTime.substring(0, 2)}:${paddedTime.substring(2, 4)}:${paddedTime.substring(4, 6)}`;
                    }
                }

                let tradeDateStr = info.d;
                if (tradeDateStr && tradeDateStr.length === 8) {
                    tradeDateStr = `${tradeDateStr.substring(0, 4)}-${tradeDateStr.substring(4, 6)}-${tradeDateStr.substring(6, 8)}`;
                } else {
                    tradeDateStr = `${tpeTime.getFullYear()}-${String(tpeTime.getMonth() + 1).padStart(2, '0')}-${String(tpeTime.getDate()).padStart(2, '0')}`;
                }

                const fullTimestamp = `${tradeDateStr} ${tradeTimeStr}+08`;

                batchData.push({
                    symbol,
                    tradeTime: fullTimestamp,
                    price: resolvedPrice,
                    open: o,
                    high: h,
                    low: l,
                    volume: v,
                    tradeVolume: tv,
                    buyIntensity,
                    sellIntensity,
                    fiveLevels: bidAskData,
                    previousClose: y
                });
            }

            if (batchData.length > 0) {
                totalUpserted += await bulkUpsert(batchData);
            }

            // 微小隨機延遲（降低封阻風險）
            const jitter = Math.floor(Math.random() * 500);
            await sleep(DELAY_BETWEEN_BATCHES_MS + jitter);
        }

        console.log(`[Cycle Complete] Upserted ${totalUpserted} ticks (${fallbackCount} via fallback price).`);
        await logCrawlerStatus('SUCCESS', `擷取完成，新增 ${totalUpserted} 筆（${fallbackCount} 筆使用回退價格）`);
        // No extra sleep - start next cycle immediately for higher frequency
    }
}

startCrawler().catch(console.error);
