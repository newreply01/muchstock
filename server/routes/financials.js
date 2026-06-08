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

// GET /api/stock/:symbol/financials
router.get('/stock/:symbol/financials', async (req, res) => {
    try {
        const { symbol } = req.params;
        const [fundamentals, monthlyRevenue, eps, dividends, balanceSheet, incomeStatement, cashFlow, ratios] = await Promise.all([
            query('SELECT * FROM fundamentals WHERE symbol = $1', [symbol]),
            query('SELECT * FROM monthly_revenue WHERE symbol = $1 ORDER BY revenue_year DESC, revenue_month DESC LIMIT 12', [symbol]),
            query('SELECT * FROM financial_statements WHERE symbol = $1 AND type = $2 ORDER BY date DESC LIMIT 8', [symbol, 'EPS']),
            query('SELECT year as date, year, cash_dividend as cash_earnings_distribution, stock_dividend as stock_earnings_distribution FROM dividend_policy WHERE symbol = $1 ORDER BY year DESC LIMIT 20', [symbol]),
            query('SELECT type as item, value, date FROM fm_financial_statements WHERE stock_id = $1 AND item = $2 ORDER BY date DESC LIMIT 1000', [symbol, 'Balance Sheet']),
            query('SELECT type as item, value, date FROM fm_financial_statements WHERE stock_id = $1 AND item = $2 ORDER BY date DESC LIMIT 1000', [symbol, 'Income Statement']),
            query('SELECT type as item, value, date FROM fm_financial_statements WHERE stock_id = $1 AND item = $2 ORDER BY date DESC LIMIT 1000', [symbol, 'Cash Flows']),
            query(`
SELECT * FROM fm_financial_statements 
                WHERE stock_id = $1 
                AND item IN('GrossProfitMargin', 'OperatingIncomeMargin', 'NetIncomeMargin', 'ROE', 'ROA')
                ORDER BY date DESC LIMIT 40
    `, [symbol])
        ]);
        res.json({
            info: fundamentals.rows[0] || null,
            revenue: monthlyRevenue.rows || [],
            eps: eps.rows || [],
            dividends: dividends.rows || [],
            statements: {
                balanceSheet: balanceSheet.rows || [],
                incomeStatement: incomeStatement.rows || [],
                cashFlow: cashFlow.rows || []
            },
            ratios: ratios.rows || []
        });
    } catch (err) {
        console.error('Error fetching financials:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stock/:symbol/valuation-history - 獲取歷史估值與河流圖數據
router.get('/stock/:symbol/valuation-history', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { years = 5 } = req.query;

        // 1. 抓取歷史 PE/PB 資料 (從 fundamentals 表抓取，這是直接來自證交所/櫃買的數據)
        const historyRes = await query(`
            SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as date, 
                   pe_ratio as pe, pb_ratio as pb, dividend_yield as dy
            FROM fundamentals 
            WHERE symbol = $1 AND trade_date >= CURRENT_DATE - INTERVAL '${years} years'
            ORDER BY trade_date ASC
        `, [symbol]);

        if (historyRes.rows.length === 0) {
            return res.json({ success: false, error: '尚無歷史估值數據' });
        }

        const history = historyRes.rows.map(r => ({
            date: r.date,
            pe: parseFloat(r.pe),
            pb: parseFloat(r.pb),
            dy: parseFloat(r.dy)
        }));

        // 2. 計算統計數值 (排除離群值或 null)
        const validPe = history.map(h => h.pe).filter(v => v !== null && v > 0 && v < 100);
        const validPb = history.map(h => h.pb).filter(v => v !== null && v > 0 && v < 20);

        const calcStats = (arr) => {
            if (arr.length === 0) return { avg: 0, std: 0 };
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
            const std = Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length);
            return { avg, std };
        };

        const peStats = calcStats(validPe);
        const pbStats = calcStats(validPb);

        // 3. 獲取當前價格與配息資訊
        const priceRes = await query('SELECT close_price FROM daily_prices WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1', [symbol]);
        const divRes = await query('SELECT cash_dividend FROM dividend_policy WHERE symbol = $1 ORDER BY year DESC LIMIT 5', [symbol]);
        
        const currentPrice = priceRes.rows[0]?.close_price || 0;
        const avgCashDiv = divRes.rows.length > 0 ? (divRes.rows.reduce((a, b) => a + parseFloat(b.cash_dividend || 0), 0) / divRes.rows.length) : 0;

        // 4. 定義區間 (River Bands) - 轉換為前端預期的陣列格式
        // 基於標準差的分佈：+2σ, +1σ, +0.5σ, 均值, -0.5σ, -1σ, -2σ
        const peBands = [
            { label: '極高估 (+2σ)', multiplier: peStats.avg + 2 * peStats.std },
            { label: '高估 (+1σ)', multiplier: peStats.avg + 1 * peStats.std },
            { label: '偏貴 (+0.5σ)', multiplier: peStats.avg + 0.5 * peStats.std },
            { label: '合理 (均值)', multiplier: peStats.avg },
            { label: '偏低 (-0.5σ)', multiplier: peStats.avg - 0.5 * peStats.std },
            { label: '低估 (-1σ)', multiplier: peStats.avg - 1 * peStats.std },
            { label: '極低估 (-2σ)', multiplier: peStats.avg - 2 * peStats.std }
        ];

        const pbBands = [
            { label: '高估 (+1σ)', multiplier: pbStats.avg + 1 * pbStats.std },
            { label: '合理 (均值)', multiplier: pbStats.avg },
            { label: '低估 (-1σ)', multiplier: pbStats.avg - 1 * pbStats.std }
        ];

        // 5. 判定當前位階 (Zone)
        const currentPe = history[history.length - 1]?.pe || 0;
        let zone = '合理區';
        const peRef = {
            veryExpensive: peStats.avg + 2 * peStats.std,
            expensive: peStats.avg + 1 * peStats.std,
            cheap: peStats.avg - 1 * peStats.std,
            veryCheap: peStats.avg - 2 * peStats.std
        };
        if (currentPe > peRef.veryExpensive) zone = '昂貴區';
        else if (currentPe > peRef.expensive) zone = '偏貴區';
        else if (currentPe < peRef.veryCheap) zone = '便宜區';
        else if (currentPe < peRef.cheap) zone = '偏低區';

        // 6. 為歷史資料增加價格，方便前端計算 EPS
        const historyWithPrice = history.map(h => ({
            ...h,
            price: h.pe > 0 ? (h.pe * (currentPrice / currentPe)) : currentPrice
        }));

        res.json({
            success: true,
            symbol,
            history: historyWithPrice,
            bands: {
                pe: peBands,
                pb: pbBands
            },
            currentPrice,
            currentPe,
            zone,
            stats: {
                peAvg: peStats.avg.toFixed(2),
                pbAvg: pbStats.avg.toFixed(2),
                avgCashDiv: avgCashDiv.toFixed(2)
            },
            yieldValuation: avgCashDiv > 0 ? {
                cheap: (avgCashDiv / 0.06).toFixed(2),
                fair: (avgCashDiv / 0.05).toFixed(2),
                expensive: (avgCashDiv / 0.04).toFixed(2)
            } : null
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


module.exports = router;
