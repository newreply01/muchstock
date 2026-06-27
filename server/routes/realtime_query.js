const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/realtime-ticks?symbol=2330&date=2026-03-02
router.get('/realtime-ticks', async (req, res) => {
    try {
        const { symbol, date } = req.query;

        if (!symbol) {
            return res.status(400).json({ success: false, error: '缺少 symbol 參數' });
        }

        // 如果沒有提供日期，優先使用當前日期 (台北時間)
        let targetDate = date;
        if (!targetDate) {
            const now = new Date();
            const taipeiDateStr = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' })).toISOString().split('T')[0];
            
            // 優先檢查今日是否有資料
            const checkTodayRes = await query(`SELECT 1 FROM realtime_ticks WHERE (trade_time AT TIME ZONE 'Asia/Taipei')::date = $1::date LIMIT 1`, [taipeiDateStr]);
            
            if (checkTodayRes.rows.length > 0) {
                targetDate = taipeiDateStr;
            } else {
                // 如果今日沒資料（休市或開盤前），尋找資料庫中最新的日期
                const latestRes = await query(`
                    SELECT MAX((trade_time AT TIME ZONE 'Asia/Taipei')::date) as latest 
                    FROM (
                        (SELECT trade_time FROM realtime_ticks LIMIT 100)
                        UNION ALL
                        (SELECT trade_time FROM realtime_ticks_history ORDER BY trade_time DESC LIMIT 1)
                    ) s
                `);
                
                if (latestRes.rows.length > 0 && latestRes.rows[0].latest) {
                    const d = new Date(latestRes.rows[0].latest);
                    targetDate = d.toISOString().split('T')[0];
                    console.log(`[RealtimeQuery] 今日(${taipeiDateStr})無資料，自動切換至最新日期: ${targetDate}`);
                } else {
                    targetDate = taipeiDateStr; // 完全沒資料才用今日
                }
            }
        }

        // 判斷該從哪張表讀取 (優先檢查 Hot Table 是否有該日期的資料)
        let tableName = 'realtime_ticks_history';
        const checkHotRes = await query(`SELECT 1 FROM realtime_ticks WHERE (trade_time AT TIME ZONE 'Asia/Taipei')::date = $1::date LIMIT 1`, [targetDate]);
        if (checkHotRes.rows.length > 0) {
            tableName = 'realtime_ticks';
        }

        // Query ticks for that entire day (Taipei time)
        // Join with stocks to get name and industry
        const sql = `
            SELECT 
                t.symbol, s.name, s.industry,
                TO_CHAR(t.trade_time, 'HH24:MI:SS') as time_str,
                t.trade_time, 
                t.price, t.open_price, t.high_price, t.low_price, 
                t.volume, t.trade_volume, 
                t.buy_intensity, t.sell_intensity, t.five_levels,
                COALESCE(
                    NULLIF(t.previous_close, 0),
                    CASE 
                        WHEN (t.trade_time AT TIME ZONE 'Asia/Taipei')::date = sn.last_update THEN sn.yest_close 
                        WHEN (t.trade_time AT TIME ZONE 'Asia/Taipei')::date > sn.last_update THEN sn.today_close
                        ELSE (SELECT close_price FROM daily_prices dp WHERE dp.symbol = t.symbol AND dp.trade_date < (t.trade_time AT TIME ZONE 'Asia/Taipei')::date ORDER BY dp.trade_date DESC LIMIT 1)
                    END
                ) as previous_close
            FROM ${tableName} t
            LEFT JOIN stocks s ON t.symbol = s.symbol
            LEFT JOIN snapshot_last_close sn ON t.symbol = sn.symbol
            WHERE t.symbol = $1 
              AND (t.trade_time AT TIME ZONE 'Asia/Taipei')::date = $2::date
            ORDER BY t.trade_time ASC
        `;

        const result = await query(sql, [symbol, targetDate]);
        const stockInfo = result.rows.length > 0 ? {
            name: result.rows[0].name,
            industry: result.rows[0].industry
        } : { name: '', industry: '' };

        res.json({
            success: true,
            symbol: symbol,
            ...stockInfo,
            date: targetDate,
            data: result.rows
        });
    } catch (err) {
        console.error('Failed to fetch realtime ticks:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/realtime-active
router.get('/realtime-active', async (req, res) => {
    try {
        const topRes = await query(`
            SELECT symbol, COUNT(*) as ticks_count 
            FROM realtime_ticks 
            GROUP BY symbol 
            ORDER BY ticks_count DESC 
            LIMIT 10
        `);

        res.json({
            success: true,
            data: topRes.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/debug/audit-crawler (Internal Audit)
router.get('/debug/audit-crawler', async (req, res) => {
    try {
        const total = await query('SELECT (SELECT COUNT(*) FROM realtime_ticks) + (SELECT COUNT(*) FROM realtime_ticks_history) as count');
        const byDate = await query(`
            SELECT date, SUM(count) as count FROM (
                SELECT TO_CHAR(DATE(trade_time AT TIME ZONE 'Asia/Taipei'), 'YYYY-MM-DD') as date, COUNT(*) as count FROM realtime_ticks GROUP BY 1
                UNION ALL
                SELECT TO_CHAR(DATE(trade_time AT TIME ZONE 'Asia/Taipei'), 'YYYY-MM-DD') as date, COUNT(*) as count FROM realtime_ticks_history GROUP BY 1
            ) s
            GROUP BY date ORDER BY date DESC LIMIT 20
        `);
        const latestRow = await query('SELECT MAX(trade_time) as max_time FROM (SELECT MAX(trade_time) as trade_time FROM realtime_ticks UNION ALL SELECT MAX(trade_time) FROM realtime_ticks_history) s');
        const uniqueSymbols = await query('SELECT COUNT(DISTINCT symbol) as count FROM realtime_ticks');

        res.json({
            success: true,
            total_records: parseInt(total.rows[0].count),
            latest_data_time: latestRow.rows[0].max_time,
            unique_symbols: parseInt(uniqueSymbols.rows[0].count),
            daily_breakdown: byDate.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/realtime/market-index - 獲取大盤加權指數即時數據
router.get('/market-index', async (req, res) => {
    try {
        const sql = `
            SELECT 
                t.*,
                s.name,
                TO_CHAR(t.trade_time, 'HH24:MI:SS') as time_str,
                COALESCE(
                    NULLIF(t.previous_close, 0),
                    CASE 
                        WHEN (t.trade_time AT TIME ZONE 'Asia/Taipei')::date = sn.last_update THEN sn.yest_close 
                        WHEN (t.trade_time AT TIME ZONE 'Asia/Taipei')::date > sn.last_update THEN sn.today_close
                        ELSE (SELECT close_price FROM daily_prices dp WHERE dp.symbol = t.symbol AND dp.trade_date < (t.trade_time AT TIME ZONE 'Asia/Taipei')::date ORDER BY dp.trade_date DESC LIMIT 1)
                    END
                ) as previous_close
            FROM (
                SELECT * FROM realtime_ticks WHERE symbol = 'TAIEX'
                UNION ALL
                SELECT * FROM realtime_ticks_history WHERE symbol = 'TAIEX'
            ) t
            LEFT JOIN stocks s ON t.symbol = s.symbol
            LEFT JOIN snapshot_last_close sn ON t.symbol = sn.symbol
            WHERE t.symbol = 'TAIEX'
            ORDER BY t.trade_time DESC
            LIMIT 1
        `;
        const result = await query(sql);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '找不到指數資料' });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Failed to fetch market index:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/realtime/:symbol - 獲取個股即時快照數據
router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const sql = `
            SELECT 
                t.*,
                s.name,
                TO_CHAR(t.trade_time, 'HH24:MI:SS') as time_str,
                COALESCE(
                    NULLIF(t.previous_close, 0),
                    CASE 
                        WHEN DATE(t.trade_time) = sn.last_update THEN sn.yest_close 
                        WHEN DATE(t.trade_time) > sn.last_update THEN sn.today_close
                        ELSE (SELECT close_price FROM daily_prices dp WHERE dp.symbol = t.symbol AND dp.trade_date < DATE(t.trade_time) ORDER BY dp.trade_date DESC LIMIT 1)
                    END
                ) as previous_close
            FROM (
                SELECT * FROM realtime_ticks WHERE symbol = $1
                UNION ALL
                SELECT * FROM realtime_ticks_history WHERE symbol = $1
            ) t
            LEFT JOIN stocks s ON t.symbol = s.symbol
            LEFT JOIN snapshot_last_close sn ON t.symbol = sn.symbol
            WHERE t.symbol = $1
            ORDER BY t.trade_time DESC
            LIMIT 1
        `;
        const result = await query(sql, [symbol]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '找不到資料' });
        }
        
        const row = result.rows[0];
        const price = parseFloat(row.price);
        const prev = parseFloat(row.previous_close);
        if (price && prev) {
            row.change = (price - prev).toFixed(2);
            row.change_percent = (((price - prev) / prev) * 100).toFixed(2);
        }
        
        res.json({
            success: true,
            data: row
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/realtime/batch - 獲取多個個股即時快照數據
router.post('/batch', async (req, res) => {
    console.log('Realtime Batch Request:', req.body);
    try {
        const { symbols } = req.body || {};
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ success: false, error: '無效或空的 symbols 陣列' });
        }

        const sql = `
            SELECT DISTINCT ON (t.symbol)
                t.*,
                s.name,
                s.industry,
                TO_CHAR(t.trade_time, 'HH24:MI:SS') as time_str,
                COALESCE(
                    NULLIF(t.previous_close, 0),
                    CASE 
                        WHEN DATE(t.trade_time) = sn.last_update THEN sn.yest_close 
                        WHEN DATE(t.trade_time) > sn.last_update THEN sn.today_close
                        ELSE (SELECT close_price FROM daily_prices dp WHERE dp.symbol = t.symbol AND dp.trade_date < DATE(t.trade_time) ORDER BY dp.trade_date DESC LIMIT 1)
                    END
                ) as previous_close
            FROM (
                SELECT * FROM realtime_ticks WHERE symbol = ANY($1)
                UNION ALL
                SELECT * FROM realtime_ticks_history WHERE symbol = ANY($1)
            ) t
            LEFT JOIN stocks s ON t.symbol = s.symbol
            LEFT JOIN snapshot_last_close sn ON t.symbol = sn.symbol
            ORDER BY t.symbol, t.trade_time DESC
        `;
        
        const result = await query(sql, [symbols]);
        
        // Convert to object for easier lookup and calculate change_percent if missing
        const dataMap = {};
        result.rows.forEach(row => {
            const price = parseFloat(row.price);
            const prev = parseFloat(row.previous_close);
            if (price && prev && (!row.change_percent || row.change_percent == 0)) {
                row.change = (price - prev).toFixed(2);
                row.change_percent = (((price - prev) / prev) * 100).toFixed(2);
            }
            dataMap[row.symbol] = row;
        });

        res.json({
            success: true,
            data: dataMap
        });
    } catch (err) {
        console.error('Failed to fetch batch realtime data:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
