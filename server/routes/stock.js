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

// GET /api/stock/compare?symbols=2330,2303
router.get('/compare', async (req, res) => {
    try {
        const symbolsStr = req.query.symbols;
        if (!symbolsStr) return res.status(400).json({ success: false, error: 'Missing symbols parameter' });
        
        const symbols = symbolsStr.split(',').map(s => s.trim()).filter(Boolean);
        if (symbols.length === 0 || symbols.length > 5) {
            return res.status(400).json({ success: false, error: 'Please provide 1 to 5 symbols' });
        }

        // Fetch basic info and latest indicators
        const placeholders = symbols.map((_, i) => `$${i + 1}`).join(',');
        const basicSql = `
            SELECT s.symbol, s.name, s.industry, s.market,
                   i.pe_ratio, i.pb_ratio, i.dividend_yield,
                   (SELECT close_price FROM daily_prices dp WHERE dp.symbol = s.symbol ORDER BY trade_date DESC LIMIT 1) as latest_price
            FROM stocks s
            LEFT JOIN indicators i ON s.symbol = i.symbol
            WHERE s.symbol IN (${placeholders})
            AND (i.trade_date = (SELECT MAX(trade_date) FROM indicators WHERE symbol = s.symbol) OR i.trade_date IS NULL)
        `;
        const basicRes = await query(basicSql, symbols);

        // Fetch historical prices for the last 120 trading days
        const historySql = `
            SELECT symbol, TO_CHAR(trade_date, 'YYYY-MM-DD') as date, close_price
            FROM daily_prices
            WHERE symbol IN (${placeholders})
            AND trade_date >= (CURRENT_DATE - INTERVAL '6 months')
            ORDER BY trade_date ASC
        `;
        const historyRes = await query(historySql, symbols);

        // Group history by symbol to make it easier for Lightweight Charts
        const seriesData = {};
        symbols.forEach(sym => { seriesData[sym] = []; });
        
        // Populate seriesData with { time, value }
        historyRes.rows.forEach(row => {
            if (seriesData[row.symbol]) {
                seriesData[row.symbol].push({
                    time: row.date,
                    close: parseFloat(row.close_price)
                });
            }
        });

        // Calculate compare_percent relative to the first available date for each symbol
        symbols.forEach(sym => {
            const series = seriesData[sym];
            if (series && series.length > 0) {
                const basePrice = series[0].close;
                series.forEach(point => {
                    point.compare_percent = basePrice > 0 ? ((point.close - basePrice) / basePrice) * 100 : 0;
                });
            }
        });

        res.json({
            success: true,
            data: {
                info: basicRes.rows,
                chart: seriesData
            }
        });
    } catch (err) {
        console.error('Failed to fetch comparison data:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/stock/:symbol/quick-diagnosis', async (req, res) => {
    console.log(`DEBUG: Quick diagnosis for ${req.params.symbol} triggered`);
    try {
        const { symbol } = req.params;

        // 1. 獲取最新價格與近 20 日高低點 (支撐壓力)
        const priceRes = await query(`
            WITH recent_prices AS (
                SELECT high_price, low_price, close_price, trade_date
                FROM daily_prices
                WHERE symbol = $1
                ORDER BY trade_date DESC
                LIMIT 20
            )
            SELECT 
                (SELECT close_price FROM recent_prices LIMIT 1) as latest_price,
                (SELECT MAX(high_price) FROM recent_prices) as high_20,
                (SELECT MIN(low_price) FROM recent_prices) as low_20,
                (SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') FROM recent_prices LIMIT 1) as latest_date
        `, [symbol]);

        const priceData = priceRes.rows[0];

        // 2. 獲取健康評分
        const healthRes = await query(`
            SELECT overall_score as score 
            FROM stock_health_scores 
            WHERE symbol = $1 
            ORDER BY calc_date DESC 
            LIMIT 1
        `, [symbol]);
        const score = healthRes.rows[0]?.score || null;

        // 3. 獲取技術指標 (RSI, MA20, MACD)
        const techRes = await query(`
            SELECT rsi_14, ma_20, macd_hist
            FROM indicators
            WHERE symbol = $1
            ORDER BY trade_date DESC
            LIMIT 1
        `, [symbol]);
        const techData = techRes.rows[0] || {};

        // 4. 獲取最新的 AI 報告摘要 (提取結論部分)
        const aiRes = await query(`
            SELECT content as report 
            FROM ai_reports 
            WHERE symbol = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [symbol]);
        
        let aiSummary = "尚無 AI 診斷報告";
        if (aiRes.rows.length > 0) {
            const fullReport = aiRes.rows[0].report;
            const conclusionMatch = fullReport.match(/【總結】|【結論】|投資建議\s*[:：]\s*(.*)/);
            if (conclusionMatch) {
                aiSummary = conclusionMatch[0].substring(0, 150) + "...";
            } else {
                aiSummary = fullReport.substring(0, 150).replace(/\n/g, ' ') + "...";
            }
        }

        // 5. 計算智慧評分 (Composite Rating)
        let techScore = 0;
        if (techData.rsi_14) {
            const rsi = parseFloat(techData.rsi_14);
            if (rsi > 70) techScore -= 0.3;
            else if (rsi < 30) techScore += 0.3;
        }
        if (techData.macd_hist) {
            techScore += parseFloat(techData.macd_hist) > 0 ? 0.2 : -0.2;
        }
        if (priceData?.latest_price && techData.ma_20) {
            techScore += priceData.latest_price > techData.ma_20 ? 0.2 : -0.2;
        }

        let priceLevelScore = 0;
        const distResistance = priceData?.high_20 > 0 ? ((priceData.high_20 - priceData.latest_price) / priceData.latest_price * 100) : null;
        const distSupport = priceData?.low_20 > 0 ? ((priceData.latest_price - priceData.low_20) / priceData.latest_price * 100) : null;
        
        if (distSupport !== null && distSupport < 2) priceLevelScore += 0.4;
        else if (distSupport !== null && distSupport < 5) priceLevelScore += 0.2;
        
        if (distResistance !== null && distResistance < 2) priceLevelScore -= 0.4;
        else if (distResistance !== null && distResistance < 5) priceLevelScore -= 0.2;

        let sentimentScore = score ? (score - 50) / 50 : 0;

        const compositeScore = (techScore * 0.4) + (priceLevelScore * 0.3) + (sentimentScore * 0.3);
        
        let ratingLabel = "中立";
        if (compositeScore > 0.55) ratingLabel = "強力推薦";
        else if (compositeScore > 0.25) ratingLabel = "推薦";
        else if (compositeScore > 0.05) ratingLabel = "偏多操作";
        else if (compositeScore < -0.55) ratingLabel = "大幅減碼";
        else if (compositeScore < -0.25) ratingLabel = "減碼";
        else if (compositeScore < -0.05) ratingLabel = "偏空觀察";

        const result = {
            symbol,
            latest_price: parseFloat(priceData?.latest_price || 0),
            latest_date: priceData?.latest_date,
            score: score ? parseInt(score) : null,
            rating: {
                score: parseFloat(compositeScore.toFixed(2)),
                label: ratingLabel,
                details: {
                    technical: parseFloat(techScore.toFixed(2)),
                    price_level: parseFloat(priceLevelScore.toFixed(2)),
                    sentiment: parseFloat(sentimentScore.toFixed(2))
                }
            },
            support_resistance: {
                resistance: parseFloat(priceData?.high_20 || 0),
                support: parseFloat(priceData?.low_20 || 0),
                distance_to_resistance: distResistance?.toFixed(2) || null,
                distance_to_support: distSupport?.toFixed(2) || null
            },
            indicators: {
                rsi: techData.rsi_14 ? parseFloat(techData.rsi_14).toFixed(2) : null,
                ma20: techData.ma_20 ? parseFloat(techData.ma_20).toFixed(2) : null,
                macd_hist: techData.macd_hist ? parseFloat(techData.macd_hist).toFixed(2) : null,
                position_vs_ma20: (priceData?.latest_price && techData.ma_20) ? (priceData.latest_price > techData.ma_20 ? '上方' : '下方') : '未知'
            },
            ai_summary: aiSummary
        };

        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Quick diagnosis failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/stock/:symbol/events', async (req, res) => {
    try {
        const { symbol } = req.params;
        const sql = `
            SELECT category, type, date, description FROM (
                SELECT 'corporate' as category, event_type as type, TO_CHAR(event_date, 'YYYY-MM-DD') as date, description
                FROM corp_events
                WHERE symbol = $1
                UNION ALL
                SELECT 'dividend' as category, '除權息' as type, 
                       TO_CHAR(date, 'YYYY-MM-DD') as date, 
                       '現金股利 ' || COALESCE(cash_dividend, 0) || ' 元' || 
                       CASE WHEN stock_dividend > 0 THEN ', 股票股利 ' || stock_dividend || ' 元' ELSE '' END as description
                FROM fm_dividend_result
                WHERE stock_id = $1
                UNION ALL
                SELECT 'dividend' as category, '公告配息' as type, 
                       (year + 1911)::text || '-01-01' as date, 
                       '配發現金股利 ' || cash_dividend || ' 元' as description
                FROM dividend_policy p
                WHERE symbol = $1
                AND NOT EXISTS (
                    SELECT 1 FROM fm_dividend_result r
                    WHERE r.stock_id = $1 AND EXTRACT(YEAR FROM r.date) = (p.year + 1911)
                )
            ) s
            ORDER BY s.date DESC
            LIMIT 20
        `;
        const result = await query(sql, [symbol]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Failed to fetch stock events:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/stock/:symbol/chart-data', async (req, res) => {
    try {
        const { symbol } = req.params;
        const result = await query(`
            SELECT 
                TO_CHAR(trade_date, 'YYYY/MM/DD') as date,
                close_price as price,
                ma5,
                ma20,
                high_target,
                low_support,
                rsi,
                CASE 
                    WHEN b_std = 0 THEN 0.5 
                    ELSE (close_price - (ma20 - 2 * b_std)) / (4 * b_std) 
                END as b_percent
            FROM (
                SELECT 
                    d.trade_date,
                    d.close_price,
                    AVG(d.close_price) OVER (ORDER BY d.trade_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) as ma5,
                    AVG(d.close_price) OVER (ORDER BY d.trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as ma20,
                    MAX(d.high_price) OVER (ORDER BY d.trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as high_target,
                    MIN(d.low_price) OVER (ORDER BY d.trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as low_support,
                    STDDEV_SAMP(d.close_price) OVER (ORDER BY d.trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as b_std,
                    i.rsi_14 as rsi
                FROM daily_prices d
                LEFT JOIN indicators i ON d.symbol = i.symbol AND d.trade_date = i.trade_date
                WHERE d.symbol = $1
            ) t
            ORDER BY trade_date DESC
            LIMIT 60
        `, [symbol]);

        const chartData = result.rows.reverse().map(row => ({
            ...row,
            price: parseFloat(row.price),
            ma5: row.ma5 ? parseFloat(parseFloat(row.ma5).toFixed(2)) : null,
            ma20: row.ma20 ? parseFloat(parseFloat(row.ma20).toFixed(2)) : null,
            high_target: parseFloat(parseFloat(row.high_target).toFixed(2)),
            low_support: parseFloat(parseFloat(row.low_support).toFixed(2)),
            rsi: row.rsi ? parseFloat(parseFloat(row.rsi).toFixed(2)) : null,
            b_percent: row.b_percent ? parseFloat(parseFloat(row.b_percent).toFixed(3)) : null
        }));

        res.json({
            success: true,
            data: chartData
        });
    } catch (err) {
        console.error('Failed to fetch chart data:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 200, period = '日K' } = req.query;

        if (period === '週K' || period === '月K') {
            const dateTrunc = period === '週K' ? 'week' : 'month';
            const sql = `
SELECT
TO_CHAR(DATE_TRUNC($3, trade_date), 'YYYY-MM-DD') as time,
    (ARRAY_AGG(open_price ORDER BY trade_date ASC))[1] as open,
    MAX(high_price) as high,
    MIN(low_price) as low,
    (ARRAY_AGG(close_price ORDER BY trade_date DESC))[1] as close,
    SUM(volume) as volume
                FROM daily_prices
                WHERE symbol = $1 AND open_price IS NOT NULL
                GROUP BY DATE_TRUNC($3, trade_date)
                ORDER BY DATE_TRUNC($3, trade_date) DESC
                LIMIT $2
    `;
            const result = await query(sql, [symbol, parseInt(limit), dateTrunc]);
            return res.json(result.rows.reverse());
        }

        const sql = `
SELECT
TO_CHAR(trade_date, 'YYYY-MM-DD') as time,
    open_price as open, high_price as high, low_price as low, close_price as close, volume
            FROM daily_prices
            WHERE symbol = $1 AND open_price IS NOT NULL
            ORDER BY trade_date DESC LIMIT $2
    `;
        const result = await query(sql, [symbol, parseInt(limit)]);
        res.json(result.rows.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
