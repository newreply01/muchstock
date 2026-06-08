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

// GET /api/stock/:symbol/quick-diagnosis - 獲取快速診斷摘要 (評分、支撐壓力、技術面)
// GET /api/institutional-total - 三大法人全市場統計
router.get('/institutional-total', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        // 彙整每日法人淨額 (單位: 億元)
        const sql = `
            SELECT 
                TO_CHAR(date, 'YYYY-MM-DD') as date,
                SUM(CASE WHEN name = 'Foreign_Investor' THEN buy / 100000000.0 ELSE 0 END) as foreign_buy,
                SUM(CASE WHEN name = 'Foreign_Investor' THEN sell / 100000000.0 ELSE 0 END) as foreign_sell,
                SUM(CASE WHEN name = 'Foreign_Investor' THEN (buy - sell) / 100000000.0 ELSE 0 END) as foreign_net,
                
                SUM(CASE WHEN name = 'Investment_Trust' THEN buy / 100000000.0 ELSE 0 END) as trust_buy,
                SUM(CASE WHEN name = 'Investment_Trust' THEN sell / 100000000.0 ELSE 0 END) as trust_sell,
                SUM(CASE WHEN name = 'Investment_Trust' THEN (buy - sell) / 100000000.0 ELSE 0 END) as trust_net,
                
                SUM(CASE WHEN name = 'Dealer_self' OR name = 'Dealer_Hedging' THEN buy / 100000000.0 ELSE 0 END) as dealer_buy,
                SUM(CASE WHEN name = 'Dealer_self' OR name = 'Dealer_Hedging' THEN sell / 100000000.0 ELSE 0 END) as dealer_sell,
                SUM(CASE WHEN name = 'Dealer_self' OR name = 'Dealer_Hedging' THEN (buy - sell) / 100000000.0 ELSE 0 END) as dealer_net,
                
                SUM(CASE WHEN name = 'total' THEN buy / 100000000.0 ELSE 0 END) as total_buy,
                SUM(CASE WHEN name = 'total' THEN sell / 100000000.0 ELSE 0 END) as total_sell,
                SUM(CASE WHEN name = 'total' THEN (buy - sell) / 100000000.0 ELSE 0 END) as total_net
            FROM fm_total_institutional
            WHERE date >= CURRENT_DATE - INTERVAL '1 day' * $1
            GROUP BY date
            ORDER BY date DESC
        `;
        const result = await query(sql, [Math.min(120, parseInt(days))]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Institutional total error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/institutional-rank - 三大法人排行
router.get('/institutional-rank', async (req, res) => {
    try {
        const { type = 'foreign', range = '3d', action = 'buy', market = 'all', stock_types = 'stock' } = req.query;
        const isSell = action === 'sell';
        const fieldMap = { 'foreign': 'foreign_net', 'investment': 'trust_net', 'dealer': 'dealer_net' };
        const field = fieldMap[type] || 'foreign_net';
        const rangeMap = { '3d': 3, '5d': 5, '10d': 10 };
        const days = rangeMap[range] || 3;
        const datesRes = await query(`
            SELECT trade_date 
            FROM institutional 
            GROUP BY trade_date
            HAVING count(*) > 1000
            ORDER BY trade_date DESC 
            LIMIT $1`, [days]);
        if (datesRes.rows.length === 0) return res.json({ success: true, data: [] });
        const targetDates = datesRes.rows.map(r => r.trade_date);

        const params = [targetDates];
        let paramCount = 2;
        let whereClause = `WHERE i.trade_date = ANY($1::date[])`;

        if (market !== 'all' && market !== '') {
            whereClause += ` AND s.market = $${paramCount}`;
            params.push(market);
            paramCount++;
        }

        const types = (stock_types || 'stock').split(',');
        let typeConditions = [];
        if (types.includes('stock')) typeConditions.push("(s.symbol ~ '^[0-9]{4}$' AND s.symbol !~ '^00')");
        if (types.includes('etf')) typeConditions.push("(s.symbol ~ '^00' OR s.name ILIKE '%ETF%')");

        if (typeConditions.length > 0) {
            whereClause += ` AND (${typeConditions.join(' OR ')})`;
        }

        const sql = `
            SELECT i.symbol, s.name, s.industry, s.market, 
                   SUM(i.${field}::numeric / 1000.0) as net_buy,
                   p.close_price, p.change_amount, p.change_percent
            FROM institutional i
            JOIN stocks s ON i.symbol = s.symbol
            LEFT JOIN LATERAL (
                SELECT close_price, change_amount, change_percent 
                FROM daily_prices dp 
                WHERE dp.symbol = i.symbol 
                ORDER BY trade_date DESC LIMIT 1
            ) p ON true
            ${whereClause}
            GROUP BY i.symbol, s.name, s.industry, s.market, p.close_price, p.change_amount, p.change_percent
            HAVING SUM(i.${field}) ${isSell ? '< 0' : '> 0'}
            ORDER BY net_buy ${isSell ? 'ASC' : 'DESC'}
            LIMIT 20
        `;
        const result = await query(sql, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Institutional rank error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// GET /api/stock/:symbol/institutional
router.get('/stock/:symbol/institutional', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 60 } = req.query;
        const sql = `
SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as date, (total_net / 1000.0) as total_net, (foreign_net / 1000.0) as foreign_net, (trust_net / 1000.0) as trust_net, (dealer_net / 1000.0) as dealer_net
            FROM institutional WHERE symbol = $1 ORDER BY trade_date DESC LIMIT $2
    `;
        const result = await query(sql, [symbol, parseInt(limit)]);
        res.json(result.rows.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
