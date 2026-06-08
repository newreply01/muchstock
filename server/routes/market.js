const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { generateAIReport } = require('../utils/ai_service');
const { analyzePosition, analyzeMultiple } = require('../position_analyzer');
const { getTaiwanDate, formatTaiwanTime, TZ, getTaiwanDateString } = require('../utils/timeUtils');

// 日期格式化助手 (解決時區偏移問題)
const formatLocalDate = (date) => {
    if (!date) return null;
    if (!(date instanceof Date)) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        date = d;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

router.get('/stocks/industries', async (req, res) => {
    try {
        const sql = `
            SELECT DISTINCT industry 
            FROM stocks 
            WHERE industry IS NOT NULL AND industry != '' AND industry != '大盤'
            ORDER BY industry ASC
            `;
        const result = await query(sql);
        res.json(result.rows.map(row => row.industry));
    } catch (err) {
        console.error('Failed to fetch industries:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/market-summary - 獲取大盤分佈、產業排行與熱門股
router.get('/market-summary', async (req, res) => {
    try {
        const { market = 'all', stock_types = 'stock' } = req.query;

        const dateDetectionSql = `
            SELECT trade_date, count(*) as count
            FROM daily_prices
            WHERE trade_date IN (
                SELECT DISTINCT trade_date FROM daily_prices ORDER BY trade_date DESC LIMIT 5
            )
            AND symbol ~ '^[0-9]{4}$'
            GROUP BY trade_date
            ORDER BY trade_date DESC
        `;
        const detectedDatesRes = await query(dateDetectionSql);

        let latestDateRaw = null;
        for (const r of detectedDatesRes.rows) {
            if (parseInt(r.count) > 500) {
                latestDateRaw = r.trade_date;
                break;
            }
        }

        if (!latestDateRaw && detectedDatesRes.rows.length > 0) {
            latestDateRaw = detectedDatesRes.rows[0].trade_date;
        }

        if (!latestDateRaw) {
            return res.json({ success: false, message: '無資料' });
        }

        const latestDate = latestDateRaw;
        const latestDateStr = formatLocalDate(latestDate);

        const twseDateRes = await query(`
            SELECT p.trade_date as max_date 
            FROM daily_prices p 
            JOIN stocks s ON p.symbol = s.symbol 
            WHERE s.market = 'twse' AND p.volume > 0 AND s.symbol ~ '^[0-9]{4}$'
            GROUP BY p.trade_date
            HAVING count(*) > 200
            ORDER BY p.trade_date DESC LIMIT 1
        `);
        const tpexDateRes = await query(`
            SELECT p.trade_date as max_date 
            FROM daily_prices p 
            JOIN stocks s ON p.symbol = s.symbol 
            WHERE s.market = 'tpex' AND p.volume > 0 AND s.symbol ~ '^[0-9]{4}$'
            GROUP BY p.trade_date
            HAVING count(*) > 200
            ORDER BY p.trade_date DESC LIMIT 1
        `);

        const latestTwseDate = twseDateRes.rows[0]?.max_date || latestDate;
        const latestTpexDate = tpexDateRes.rows[0]?.max_date || latestDate;
        const latestTwseDateStr = formatLocalDate(latestTwseDate);
        const latestTpexDateStr = formatLocalDate(latestTpexDate);

        let whereClause = "WHERE p.trade_date = $1";
        const params = [latestDate];
        let paramCount = 2;

        if (market !== 'all') {
            whereClause += ` AND s.market = $${paramCount}`;
            params.push(market);
            paramCount++;
        }

        const types = (stock_types || 'stock').split(',');
        let typeConditions = [];
        if (types.includes('stock')) typeConditions.push("(s.symbol ~ '^[0-9]{4}$' AND s.symbol !~ '^00')");
        if (types.includes('etf')) typeConditions.push("(s.symbol ~ '^00' OR s.name ILIKE '%ETF%')");

        const typeFilter = typeConditions.length > 0 ? `AND (${typeConditions.join(' OR ')})` : '';

        const distributionSql = `
        SELECT
            COUNT(*) filter(where change_percent >= 9.5) as limit_up,
            COUNT(*) filter(where change_percent >= 5 AND change_percent < 9.5) as up_5,
            COUNT(*) filter(where change_percent >= 2 AND change_percent < 5) as up_2_5,
            COUNT(*) filter(where change_percent > 0 AND change_percent < 2) as up_0_2,
            COUNT(*) filter(where change_percent = 0) as flat,
            COUNT(*) filter(where change_percent < 0 AND change_percent > -2) as down_0_2,
            COUNT(*) filter(where change_percent <= -2 AND change_percent > -5) as down_2_5,
            COUNT(*) filter(where change_percent <= -5 AND change_percent > -9.5) as down_5,
            COUNT(*) filter(where change_percent <= -9.5) as limit_down
        FROM daily_prices p
            JOIN stocks s ON p.symbol = s.symbol
            ${whereClause} ${typeFilter}
        `;
        const distResult = await query(distributionSql, params);

        const industrySql = `
        SELECT
        s.industry,
            AVG(p.change_percent) as avg_change,
            COUNT(*) as stock_count
            FROM daily_prices p
            JOIN stocks s ON p.symbol = s.symbol
            ${whereClause} AND s.industry IS NOT NULL AND s.industry != '' ${typeFilter}
            GROUP BY s.industry
            ORDER BY avg_change DESC
            LIMIT 20
            `;
        const industryResult = await query(industrySql, params);

        const [
            twseResult,
            tpexResult,
            twseGainersResult,
            twseLosersResult,
            tpexGainersResult,
            tpexLosersResult
        ] = await Promise.all([
            query(`
                SELECT s.symbol, s.name, p.close_price, p.change_percent, p.volume, TO_CHAR(p.trade_date, 'YYYY-MM-DD') as date
                FROM daily_prices p
                JOIN stocks s ON p.symbol = s.symbol
                WHERE p.trade_date = $1 AND s.market = 'twse' ${typeFilter}
                ORDER BY p.volume DESC LIMIT 10
            `, [latestTwseDate]),
            query(`
                SELECT s.symbol, s.name, p.close_price, p.change_percent, p.volume, TO_CHAR(p.trade_date, 'YYYY-MM-DD') as date
                FROM daily_prices p
                JOIN stocks s ON p.symbol = s.symbol
                WHERE p.trade_date = $1 AND s.market = 'tpex' ${typeFilter}
                ORDER BY p.volume DESC LIMIT 10
            `, [latestTpexDate]),
            query(`
                SELECT s.symbol, s.name, p.close_price, p.change_amount, p.volume
                FROM daily_prices p
                JOIN stocks s ON p.symbol = s.symbol
                WHERE p.trade_date = $1 AND s.market = 'twse' AND p.change_amount IS NOT NULL ${typeFilter}
                ORDER BY p.change_amount DESC LIMIT 10
            `, [latestTwseDate]),
            query(`
                SELECT s.symbol, s.name, p.close_price, p.change_amount, p.volume
                FROM daily_prices p
                JOIN stocks s ON p.symbol = s.symbol
                WHERE p.trade_date = $1 AND s.market = 'twse' AND p.change_amount IS NOT NULL ${typeFilter}
                ORDER BY p.change_amount ASC LIMIT 10
            `, [latestTwseDate]),
            query(`
                SELECT s.symbol, s.name, p.close_price, p.change_amount, p.volume
                FROM daily_prices p
                JOIN stocks s ON p.symbol = s.symbol
                WHERE p.trade_date = $1 AND s.market = 'tpex' AND p.change_amount IS NOT NULL ${typeFilter}
                ORDER BY p.change_amount DESC LIMIT 10
            `, [latestTpexDate]),
            query(`
                SELECT s.symbol, s.name, p.close_price, p.change_amount, p.volume
                FROM daily_prices p
                JOIN stocks s ON p.symbol = s.symbol
                WHERE p.trade_date = $1 AND s.market = 'tpex' AND p.change_amount IS NOT NULL ${typeFilter}
                ORDER BY p.change_amount ASC LIMIT 10
            `, [latestTpexDate])
        ]);

        res.json({
            success: true,
            latestDate: latestDateStr,
            marketDates: {
                twse: latestTwseDateStr,
                tpex: latestTpexDateStr
            },
            distribution: distResult.rows[0],
            industries: industryResult.rows,
            twseVolume: twseResult.rows,
            tpexVolume: tpexResult.rows,
            twseGainers: twseGainersResult.rows,
            twseLosers: twseLosersResult.rows,
            tpexGainers: tpexGainersResult.rows,
            tpexLosers: tpexLosersResult.rows
        });
    } catch (err) {
        console.error('Market summary error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stats
router.get('/stats', async (req, res) => {
    try {
        // 1. Get latest historical date
        const dateRes = await query("SELECT trade_date FROM daily_prices ORDER BY trade_date DESC LIMIT 1");
        const histDate = dateRes.rows[0]?.trade_date;

        // 2. Get latest realtime date
        const realtimeRes = await query("SELECT MAX(trade_time AT TIME ZONE 'Asia/Taipei') as max_time FROM realtime_ticks");
        const rtMaxTime = realtimeRes.rows[0]?.max_time;
        const rtDateStr = rtMaxTime ? new Date(rtMaxTime).toISOString().split('T')[0] : null;

        const histDateStr = histDate ? new Date(histDate).toISOString().split('T')[0] : null;

        // Determine if we should use realtime stats (rtDate is today and potentially newer than histDate)
        // Note: trade_date in daily_prices is often set to start of day, so we compare strings
        if (rtDateStr && (!histDateStr || rtDateStr >= histDateStr)) {
            // Check if we have enough realtime data to bother recalculating
            const countRes = await query("SELECT COUNT(*) FROM realtime_ticks WHERE (trade_time AT TIME ZONE 'Asia/Taipei')::date = $1", [rtDateStr]);
            if (parseInt(countRes.rows[0].count) > 100) {
                // Calculate breadth from realtime ticks vs snapshot closer
                const breadthSql = `
                    WITH latest_ticks AS (
                        SELECT DISTINCT ON (symbol) symbol, price
                        FROM realtime_ticks
                        WHERE (trade_time AT TIME ZONE 'Asia/Taipei')::date = $1
                        ORDER BY symbol, trade_time DESC
                    ),
                    universe AS (
                        SELECT s.symbol, sn.yest_close, t.price
                        FROM stocks s
                        LEFT JOIN snapshot_last_close sn ON s.symbol = sn.symbol
                        LEFT JOIN latest_ticks t ON s.symbol = t.symbol
                        WHERE (s.symbol ~ '^[0-9]{4}$' OR s.symbol ~ '^[0-9]{5,6}$')
                    )
                    SELECT 
                        COUNT(*) FILTER (WHERE price > yest_close AND yest_close > 0) as up_count,
                        COUNT(*) FILTER (WHERE price < yest_close AND yest_close > 0) as down_count,
                        COUNT(*) FILTER (WHERE (price = yest_close) OR (price IS NULL) OR (yest_close IS NULL OR yest_close = 0)) as flat_count,
                        AVG(CASE WHEN price IS NOT NULL AND yest_close > 0 THEN ((price - yest_close) / yest_close) * 100 END) as avg_change
                    FROM universe
                `;
                const breadthRes = await query(breadthSql, [rtDateStr]);
                const stats = breadthRes.rows[0];
                return res.json({
                    ...stats,
                    latestDate: rtDateStr
                });
            }
        }

        // Fallback to historical if no realtime data or it's older
        if (!histDate) return res.json({});
        const sql = `
            SELECT
                COUNT(*) filter(where change_percent > 0) as up_count,
                COUNT(*) filter(where change_percent < 0) as down_count,
                COUNT(*) filter(where change_percent = 0) as flat_count,
                AVG(change_percent) as avg_change,
                TO_CHAR($1::date, 'YYYY-MM-DD') as "latestDate"
            FROM daily_prices
            WHERE trade_date = $1
        `;
        const result = await query(sql, [histDate]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Stats API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/news
router.get('/news', async (req, res) => {
    try {
        const { category = 'headline', limit = 10 } = req.query;
        const sql = `
            SELECT news_id, category, title, summary, image_url, publish_at
            FROM news
            WHERE $1 = ANY(string_to_array(category, ','))
            ORDER BY publish_at DESC
            LIMIT $2
    `;
        const result = await query(sql, [category, parseInt(limit)]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stock/:symbol/news - 個股新聞
router.get('/stock/:symbol/news', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 10 } = req.query;
        const sql = `
SELECT
stock_id,
    TO_CHAR(date, 'YYYY-MM-DD') as date,
    title,
    source,
    description as summary
            FROM fm_stock_news
            WHERE stock_id = $1
            ORDER BY date DESC, title ASC
            LIMIT $2
        `;
        const result = await query(sql, [symbol, parseInt(limit)]);
        const news = result.rows.map((row, idx) => ({
            news_id: `fm-${row.stock_id}-${row.date}-${idx}`,
            title: row.title,
            summary: row.summary,
            publish_at: row.date,
            source: row.source
        }));
        res.json(news);
    } catch (err) {
        console.error('Failed to fetch stock news:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/market-stats - 市場統計
router.get('/market-stats', async (req, res) => {
    try {
        const dateRes = await query(`SELECT trade_date FROM daily_prices GROUP BY trade_date HAVING count(*) > 500 ORDER BY trade_date DESC LIMIT 1`);
        const latestDate = dateRes.rows[0]?.trade_date;
        if (!latestDate) return res.json({});
        const sql = `
        SELECT COUNT(*) filter(where change_percent > 0) as up_count, COUNT(*) filter(where change_percent < 0) as down_count, TO_CHAR($1::date, 'YYYY-MM-DD') as latestDate
        FROM daily_prices WHERE trade_date = $1
        `;
        const result = await query(sql, [latestDate]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/market-margin - 獲取大盤融資融券餘額
router.get('/market-margin', async (req, res) => {
    try {
        // 我們只要 MarginPurchaseMoney (金額) 與 ShortSale (券)
        const sql = `
            SELECT * FROM (
                SELECT 
                    m.date::text as trade_date,
                    SUM(CASE WHEN m.name = 'MarginPurchaseMoney' THEN COALESCE(m.margin_purchase_today_balance, 0) ELSE 0 END)::bigint as margin_balance,
                    SUM(CASE WHEN m.name = 'ShortSale' THEN COALESCE(m.short_sale_today_balance, 0) ELSE 0 END)::bigint as short_balance,
                    MAX(p.close_price) as index_price
                FROM fm_total_margin m
                LEFT JOIN daily_prices p ON m.date = p.trade_date AND p.symbol = 'TAIEX'
                GROUP BY m.date
                ORDER BY m.date DESC
                LIMIT 100
            ) t ORDER BY t.trade_date ASC
        `;
        const result = await query(sql);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Market margin error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/market-focus - 獲取市場焦點 (各類熱門股)
router.get('/market-focus', async (req, res) => {
    try {
        const { market = 'all', stock_types = 'stock' } = req.query;
        const sql = `
            SELECT trade_date, turnover, hot, foreign3d, trust3d, main3d
            FROM market_focus_daily
            WHERE market = $1 AND stock_types = $2
            ORDER BY trade_date DESC
            LIMIT 1
        `;
        const result = await query(sql, [market, stock_types]);
        if (result.rows.length === 0) {
            return res.json({ success: true, data: null });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Market focus error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});


module.exports = router;
