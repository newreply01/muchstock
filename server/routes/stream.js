const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
const EventEmitter = require('events');
const logger = require('../utils/logger'); // Assuming logger is accessible here

const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(0); // Allow unlimited SSE connections

// Set up a dedicated pg Client to LISTEN for realtime_update
let listenClient = null;
let dbUpdateTimeout = null;

async function setupListenClient() {
    try {
        listenClient = await pool.connect();
        await listenClient.query('LISTEN realtime_update');
        listenClient.on('notification', (msg) => {
            if (msg.channel === 'realtime_update') {
                // Throttle: max 1 push per second
                if (!dbUpdateTimeout) {
                    dbUpdateTimeout = setTimeout(() => {
                        sseEmitter.emit('db_update');
                        dbUpdateTimeout = null;
                    }, 1000);
                }
            }
        });
        logger.info('[SSE] Database LISTEN configured for realtime_update');
        
        listenClient.on('error', (err) => {
            logger.error(`[SSE] Listen client error: ${err.message}`);
            // Attempt to reconnect
            listenClient.release(true);
            setTimeout(setupListenClient, 5000);
        });
    } catch (err) {
        if (logger) logger.error(`[SSE] Failed to setup LISTEN client: ${err.message}`);
        setTimeout(setupListenClient, 5000);
    }
}
// Start listening for DB triggers
setupListenClient();

router.get('/realtime', async (req, res) => {
    const symbolsParam = req.query.symbols;
    if (!symbolsParam) {
        return res.status(400).json({ success: false, error: '缺少 symbols 參數' });
    }

    const symbols = symbolsParam.split(',').filter(Boolean);
    if (symbols.length === 0) {
        return res.status(400).json({ success: false, error: 'symbols 參數不可為空' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Flush headers to establish connection
    res.flushHeaders();

    // Map to keep track of latest trade_time we've sent for each symbol
    const lastSentTime = {};
    let isClosed = false;

    // The function triggered by DB updates
    const pushData = async () => {
        if (isClosed) return;

        try {
            const sql = `
                WITH LatestTicks AS (
                    SELECT 
                        t.symbol, t.trade_time, t.price, t.open_price, t.high_price, t.low_price, 
                        t.volume, t.trade_volume, t.buy_intensity, t.sell_intensity, t.five_levels,
                        s.name, s.industry,
                        COALESCE(t.previous_close, (SELECT close_price FROM daily_prices dp WHERE dp.symbol = t.symbol AND dp.trade_date < DATE(t.trade_time) ORDER BY dp.trade_date DESC LIMIT 1)) as previous_close,
                        ROW_NUMBER() OVER (PARTITION BY t.symbol ORDER BY t.trade_time DESC) as rn
                    FROM realtime_ticks t
                    LEFT JOIN stocks s ON t.symbol = s.symbol
                    WHERE t.symbol = ANY($1::varchar[])
                )
                SELECT * FROM LatestTicks WHERE rn = 1;
            `;

            const result = await query(sql, [symbols]);

            const updates = [];
            for (const row of result.rows) {
                const sym = row.symbol;
                const timeStr = new Date(row.trade_time).getTime();

                // If we haven't sent this tick yet, queue it for update
                if (!lastSentTime[sym] || lastSentTime[sym] < timeStr) {
                    lastSentTime[sym] = timeStr;
                    
                    // 計算漲跌與漲跌幅
                    const price = parseFloat(row.price);
                    const prevClose = parseFloat(row.previous_close || price);
                    const change = price - prevClose;
                    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
                    
                    // 轉為前端預期的格式
                    row.change = change;
                    row.changePercent = changePercent;

                    updates.push(row);
                }
            }

            if (updates.length > 0 && !isClosed) {
                res.write(`data: ${JSON.stringify(updates)}\n\n`);
            }
        } catch (err) {
            if (logger) logger.error(`[SSE Error] ${err.message}`);
        }
    };

    // Send initial data immediately
    await pushData();

    // Subscribe to global db_update event
    sseEmitter.on('db_update', pushData);

    // Provide a heart-beat fallback every 30 seconds to keep connection alive
    const keepAliveInterval = setInterval(() => {
        if (!isClosed) res.write(':\n\n');
    }, 30000);

    req.on('close', () => {
        isClosed = true;
        sseEmitter.off('db_update', pushData);
        clearInterval(keepAliveInterval);
        res.end();
    });
});

module.exports = router;
