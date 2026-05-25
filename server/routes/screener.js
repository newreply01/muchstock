const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { generateAIReport } = require('../utils/ai_service');
const { analyzePosition, analyzeMultiple } = require('../position_analyzer');
const { getTaiwanDate, formatTaiwanTime, TZ, getTaiwanDateString } = require('../utils/timeUtils');
const { requireAuth, requireRole } = require('../middleware/auth');

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
            // 嘗試提取「總結」或「結論」部分，若沒找到則取前 150 字
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
            if (rsi > 70) techScore -= 0.3; // 超買
            else if (rsi < 30) techScore += 0.3; // 超跌
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
        
        if (distSupport !== null && distSupport < 2) priceLevelScore += 0.4; // 接近支撐
        else if (distSupport !== null && distSupport < 5) priceLevelScore += 0.2;
        
        if (distResistance !== null && distResistance < 2) priceLevelScore -= 0.4; // 接近壓力
        else if (distResistance !== null && distResistance < 5) priceLevelScore -= 0.2;

        let sentimentScore = score ? (score - 50) / 50 : 0; // 基於健康分 (-1 to 1)

        // 綜合權重: 技術 40%, 價格位置 30%, 情緒 30%
        const compositeScore = (techScore * 0.4) + (priceLevelScore * 0.3) + (sentimentScore * 0.3);
        
        let ratingLabel = "中立";
        if (compositeScore > 0.55) ratingLabel = "強力推薦";
        else if (compositeScore > 0.25) ratingLabel = "推薦";
        else if (compositeScore > 0.05) ratingLabel = "偏多操作";
        else if (compositeScore < -0.55) ratingLabel = "大幅減碼";
        else if (compositeScore < -0.25) ratingLabel = "減碼";
        else if (compositeScore < -0.05) ratingLabel = "偏空觀察";

        // 整合數據
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

// GET /api/stock/:symbol/events - 獲取個股大事記 (法說會、除權息等)
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

// GET /api/screen - 篩選股票 (支持分頁與篩選)
router.get(['/stocks', '/screen'], async (req, res) => {
    try {
        const {
            search = '',
            industry = '',
            patterns = '',
            sort_by = 'volume',
            sort_dir = 'desc',
            page = 1,
            limit = 50,
            price_min, price_max,
            change_min, change_max,
            volume_min, volume_max,
            pe_min, pe_max,
            pb_min, pb_max,
            yield_min, yield_max,
            rsi_min, rsi_max,
            macd_hist_min, macd_hist_max,
            ma20_min, ma20_max,
            adx_min, adx_max,
            bb_width_min, bb_width_max,
            wpr_min, wpr_max,
            foreign_net_min, foreign_net_max,
            trust_net_min, trust_net_max,
            dealer_net_min, dealer_net_max,
            total_net_min, total_net_max,
            date,
            market,
            strategy,
            stock_types = 'stock'
        } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

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
            return res.json({ success: true, data: [], total: 0, page: parseInt(page), totalPages: 0, latestDate: null });
        }

        if (date) {
            const requestedDate = new Date(date);
            if (!isNaN(requestedDate)) latestDateRaw = requestedDate;
        }

        let actualDate = latestDateRaw;
        for (const r of detectedDatesRes.rows) {
            if (r.trade_date <= latestDateRaw && parseInt(r.count) > 500) {
                actualDate = r.trade_date;
                break;
            }
        }

        const params = [actualDate];
        let paramCount = 2;
        let whereClause = `WHERE p.trade_date = $1`;

        if (search) {
            whereClause += ` AND (s.symbol ILIKE $${paramCount} OR s.name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (industry && industry !== 'all') {
            whereClause += ` AND s.industry = $${paramCount}`;
            params.push(industry);
            paramCount++;
        }

        if (market && market !== 'all') {
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

        const addRangeFilter = (col, min, max) => {
            if (min !== undefined && min !== '' && min !== null) {
                whereClause += ` AND ${col} >= $${paramCount}`;
                params.push(parseFloat(min));
                paramCount++;
            }
            if (max !== undefined && max !== '' && max !== null) {
                whereClause += ` AND ${col} <= $${paramCount}`;
                params.push(parseFloat(max));
                paramCount++;
            }
        };

        addRangeFilter('p.close_price', price_min, price_max);
        addRangeFilter('p.change_percent', change_min, change_max);
        addRangeFilter('p.volume', volume_min, volume_max);
        addRangeFilter('f.pe_ratio', pe_min, pe_max);
        addRangeFilter('f.pb_ratio', pb_min, pb_max);
        addRangeFilter('f.dividend_yield', yield_min, yield_max);
        addRangeFilter('i.rsi_14', rsi_min, rsi_max);
        addRangeFilter('i.macd_hist', macd_hist_min, macd_hist_max);
        addRangeFilter('i.ma_20', ma20_min, ma20_max);
        addRangeFilter('inst.foreign_net', foreign_net_min, foreign_net_max);
        addRangeFilter('inst.trust_net', trust_net_min, trust_net_max);
        addRangeFilter('inst.dealer_net', dealer_net_min, dealer_net_max);
        addRangeFilter('inst.dealer_net', dealer_net_min, dealer_net_max);
        addRangeFilter('inst.total_net', total_net_min, total_net_max);

        let lynnJoin = '';
        if (strategy === 'lynn_lin_20w_breakout') {
            lynnJoin = `
            JOIN (
                WITH weekly_data AS (
                    SELECT 
                        symbol,
                        date_trunc('week', trade_date) as week,
                        (array_agg(close_price ORDER BY trade_date DESC))[1] as close_price
                    FROM daily_prices
                    WHERE trade_date <= $1::date
                    GROUP BY symbol, week
                ),
                ma_calc AS (
                    SELECT 
                        symbol,
                        week,
                        close_price,
                        AVG(close_price) OVER (PARTITION BY symbol ORDER BY week ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as ma20w,
                        LAG(close_price) OVER (PARTITION BY symbol ORDER BY week) as prev_close,
                        LAG(AVG(close_price) OVER (PARTITION BY symbol ORDER BY week ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)) OVER (PARTITION BY symbol ORDER BY week) as prev_ma20w
                    FROM weekly_data
                )
                SELECT symbol
                FROM ma_calc
                WHERE week = date_trunc('week', $1::date)
                AND close_price > ma20w
                AND (prev_close <= prev_ma20w OR prev_ma20w IS NULL)
            ) lynn ON s.symbol = lynn.symbol
            `;
        }

        if (strategy) {
            switch (strategy) {
                case 'bullish_ma':
                    whereClause += ` AND i.ma_5 > i.ma_10 AND i.ma_10 > i.ma_20 AND i.ma_20 > i.ma_60 AND p.close_price > i.ma_5`;
                    break;
                case 'breakout':
                    whereClause += ` AND p.close_price > i.ma_20 AND p.open_price < i.ma_20 AND p.close_price > p.open_price`;
                    break;
                case 'high_yield':
                    whereClause += ` AND f.dividend_yield > 5`;
                    break;
                case 'value_invest':
                    whereClause += ` AND f.pe_ratio > 0 AND f.pe_ratio < 15 AND f.pb_ratio > 0 AND f.pb_ratio < 1`;
                    break;
                case 'inst_buy':
                    whereClause += ` AND inst.foreign_net > 0 AND inst.trust_net > 0`;
                    break;
                case 'kenneth_fisher':
                    whereClause += ` AND f.pe_ratio > 0 AND f.pe_ratio < 15 AND p.change_percent > 0`;
                    break;
                case 'michael_price':
                    whereClause += ` AND f.pb_ratio > 0 AND f.pb_ratio < 1.2 AND f.dividend_yield > 3`;
                    break;
                case 'warren_buffett':
                    whereClause += ` AND f.pe_ratio > 0 AND f.pe_ratio < 20 AND f.pb_ratio < 1.5 AND f.dividend_yield > 2`;
                    break;
                case 'benjamin_graham':
                    whereClause += ` AND f.pe_ratio > 0 AND f.pb_ratio > 0 AND (f.pe_ratio * f.pb_ratio) < 22.5`;
                    break;
                case 'peter_lynch':
                    whereClause += ` AND f.pe_ratio > 0 AND f.pe_ratio < 12 AND p.close_price > i.ma_20`;
                    break;
                case 'michael_murphy':
                    whereClause += ` AND i.ma_5 > i.ma_10 AND i.ma_10 > i.ma_20`;
                    break;
                case 'safe_dividend':
                    whereClause += ` AND f.dividend_yield > 5`;
                    break;
                case 'financial_giant':
                    whereClause += ` AND inst.total_net > 1000 AND p.change_percent > 0`;
                    break;
                case 'lynn_lin_20w_breakout':
                    // Already handled by lynnJoin filter
                    break;
            }
        }

        if (patterns) {
            const patternList = patterns.split(',').filter(Boolean);
            if (patternList.length > 0) {
                whereClause += ` AND (i.patterns ?| $${paramCount})`;
                params.push(patternList);
                paramCount++;
            }
        }

        const baseQuery = `
            FROM stocks s
            JOIN daily_prices p ON s.symbol = p.symbol
            ${lynnJoin}
            LEFT JOIN LATERAL (
                SELECT pe_ratio, pb_ratio, dividend_yield
                FROM fundamentals f_sub
                WHERE f_sub.symbol = s.symbol AND f_sub.trade_date <= $1::date
                ORDER BY f_sub.trade_date DESC
                LIMIT 1
            ) f ON true
            LEFT JOIN LATERAL (
                SELECT foreign_net, trust_net, dealer_net, total_net
                FROM institutional inst_sub
                WHERE inst_sub.symbol = s.symbol AND inst_sub.trade_date <= $1::date
                ORDER BY inst_sub.trade_date DESC
                LIMIT 1
            ) inst ON true
            LEFT JOIN LATERAL (
                SELECT patterns, rsi_14, macd_hist, ma_5, ma_10, ma_20, ma_60
                FROM indicators i_sub
                WHERE i_sub.symbol = s.symbol AND i_sub.trade_date <= $1::date
                ORDER BY i_sub.trade_date DESC
                LIMIT 1
            ) i ON true
            ${whereClause}
        `;

        const countResult = await query(`SELECT COUNT(*) ${baseQuery}`, params);
        const total = parseInt(countResult.rows[0].count);

        const dataSQL = `
            SELECT 
                s.symbol, s.name, s.industry, s.market,
                p.open_price, p.high_price, p.low_price, p.close_price, p.change_percent, p.volume,
                f.pe_ratio, f.pb_ratio, f.dividend_yield,
                inst.foreign_net, inst.trust_net, inst.dealer_net, inst.total_net,
                i.rsi_14, i.macd_hist, i.ma_20 as ma_20, i.patterns,
                p.trade_date::text as result_date
            ${baseQuery}
            ORDER BY ${sort_by === 'symbol' ? 's.symbol' : sort_by === 'name' ? 's.name' : 'p.' + sort_by} ${sort_dir}
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        params.push(parseInt(limit), offset);

        const dataResult = await query(dataSQL, params);
        const displayDateStr = formatLocalDate(actualDate);

        res.json({
            success: true,
            data: dataResult.rows,
            total: total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            latestDate: displayDateStr
        });
    } catch (err) {
        console.error('Screener error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/stock/:symbol/ai-prediction - AI 漲跌機率預測
router.get('/stock/:symbol/ai-prediction', async (req, res) => {
    try {
        const { symbol } = req.params;

        // 取得近 20 日技術指標
        const techSql = `
            SELECT d.close_price, d.change_percent, d.volume,
                   i.rsi_14, i.macd_hist, i.ma_5, i.ma_20, i.ma_60
            FROM daily_prices d
            LEFT JOIN indicators i ON d.symbol = i.symbol AND d.trade_date = i.trade_date
            WHERE d.symbol = $1
            ORDER BY d.trade_date DESC LIMIT 20
        `;
        const techRes = await query(techSql, [symbol]);
        if (techRes.rows.length < 5) {
            return res.json({ success: false, error: '資料不足' });
        }

        const latest = techRes.rows[0];
        const rsi = parseFloat(latest.rsi_14) || 50;
        const macdHist = parseFloat(latest.macd_hist) || 0;
        const close = parseFloat(latest.close_price);
        const ma5 = parseFloat(latest.ma_5) || close;
        const ma20 = parseFloat(latest.ma_20) || close;

        // 近 5 日法人
        const instSql = `
            SELECT COALESCE(SUM(sub.net), 0) as net_5d FROM (
                SELECT (foreign_net + trust_net + dealer_net) as net
                FROM institutional WHERE symbol = $1
                ORDER BY trade_date DESC LIMIT 5
            ) sub
        `;
        const instRes = await query(instSql, [symbol]);
        const net5d = parseInt(instRes.rows[0]?.net_5d) || 0;

        // 取得近 10 日法人買賣超以計算主力燈號
        const inst10dSql = `
            SELECT total_net, foreign_net, trust_net, dealer_net, trade_date
            FROM institutional
            WHERE symbol = $1
            ORDER BY trade_date DESC LIMIT 10
        `;
        const inst10dRes = await query(inst10dSql, [symbol]);
        const inst10d = inst10dRes.rows;

        // 取得最新 AI 報告情緒分數 (對齊 AI 情緒與技術/籌碼預測)
        let aiSentiment = 50;
        const aiReportRes = await query(`
            SELECT sentiment_score FROM ai_reports 
            WHERE symbol = $1 
            ORDER BY report_date DESC LIMIT 1
        `, [symbol]);
        if (aiReportRes.rows.length > 0) {
            const rawScore = aiReportRes.rows[0].sentiment_score;
            // 轉換為 0-100 正規化範圍 (有些舊數據可能存 0.0-1.0，需在此防呆)
            if (rawScore <= 1.0 && rawScore >= 0.0) {
                aiSentiment = Math.round(rawScore * 100);
            } else {
                aiSentiment = parseInt(rawScore) || 50;
            }
        }

        // 計算近 5 日動量
        const changes = techRes.rows.slice(0, 5).map(r => parseFloat(r.change_percent) || 0);
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

        // 主力燈號判定邏輯
        let mainForceStatus = '-';
        let mainForceDesc = '觀察';
        let mainForceReason = '主力買賣無常\n法人多空不明\n區間整理，建議觀察';

        if (inst10d.length >= 3) {
            const net10d = inst10d.reduce((sum, r) => sum + (parseInt(r.total_net) || 0), 0);
            const isAboveMA20 = close >= ma20;

            // 不同成交規模個股應有自適應門檻，此處以 500 張作為中大型股主力門檻基準
            if (net10d > 800 && isAboveMA20) {
                mainForceStatus = '多';
                mainForceDesc = '多頭';
                mainForceReason = `主力 10 日累計大買 ${net10d.toLocaleString()} 張\n法人買盤積極且站上月線\n偏多控盤，多頭佔優`;
            } else if (net10d < -800 && !isAboveMA20) {
                mainForceStatus = '空';
                mainForceDesc = '空頭';
                mainForceReason = `主力 10 日累計大賣 ${Math.abs(net10d).toLocaleString()} 張\n法人持續調節且跌破月線\n偏空操作，多單迴避`;
            } else if (net10d > 200) {
                mainForceStatus = '偏多';
                mainForceDesc = '偏多';
                mainForceReason = `主力 10 日累計買超 ${net10d.toLocaleString()} 張\n法人小幅布局\n高檔震盪，伺機突破`;
            } else if (net10d < -200) {
                mainForceStatus = '偏空';
                mainForceDesc = '偏空';
                mainForceReason = `主力 10 日累計賣超 ${Math.abs(net10d).toLocaleString()} 張\n法人調節賣壓\n高檔震盪，注意回檔`;
            } else {
                mainForceStatus = '-';
                mainForceDesc = '觀察';
                mainForceReason = `主力 10 日買賣互見 (累計 ${net10d.toLocaleString()} 張)\n法人動向不明\n區間整理，建議靜待訊號`;
            }
        }

        // 多因子機率模型
        let upScore = 50;
        // RSI
        if (rsi < 30) upScore += 12;
        else if (rsi < 40) upScore += 6;
        else if (rsi > 70) upScore -= 12;
        else if (rsi > 60) upScore -= 4;
        // MACD
        if (macdHist > 0) upScore += 5;
        else upScore -= 5;
        // 均線位置
        if (close > ma5 && ma5 > ma20) upScore += 8;
        else if (close < ma5 && ma5 < ma20) upScore -= 8;
        // 法人
        if (net5d > 500) upScore += 6;
        else if (net5d < -500) upScore -= 6;
        // 動量
        if (avgChange > 1) upScore += 4;
        else if (avgChange < -1) upScore -= 4;

        // 結合 AI 情緒微調 (最大影響 +/- 10 分)
        const aiAdjustment = (aiSentiment - 50) * 0.2;
        upScore += aiAdjustment;

        // 限制範圍
        upScore = Math.max(10, Math.min(85, upScore));
        const flatScore = Math.max(5, 25 - Math.abs(upScore - 50) * 0.5);
        const downScore = Math.max(5, 100 - upScore - flatScore);
        const total = upScore + downScore + flatScore;

        res.json({
            success: true,
            data: {
                up: Math.round(upScore / total * 100),
                down: Math.round(downScore / total * 100),
                flat: Math.round(flatScore / total * 100),
                factors: {
                    rsi: parseFloat(rsi.toFixed(1)),
                    macd_hist: parseFloat(macdHist.toFixed(2)),
                    ma_position: close > ma20 ? '上方' : '下方',
                    inst_net_5d: net5d,
                    momentum_5d: parseFloat(avgChange.toFixed(2)),
                    ai_sentiment: aiSentiment
                },
                main_force: {
                    status: mainForceStatus,
                    status_desc: mainForceDesc,
                    reason: mainForceReason
                },
                updated_at: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('AI prediction failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/stock/:symbol/ai-report
router.get('/stock/:symbol/ai-report', async (req, res) => {

    try {


        const { symbol } = req.params;
        const result = await query('SELECT content as report, sentiment_score, created_at FROM ai_reports WHERE symbol = $1', [symbol]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    report: "目前尚無此個股的 AI 分析報告。",
                    sentiment_score: 0.5
                }
            });
        }

        const data = result.rows[0];
        // Scale sentiment_score from 0-100 integer to 0.0-1.0 float if it's > 1
        if (data.sentiment_score > 1) {
            data.sentiment_score = data.sentiment_score / 100;
        }

        res.json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error('Failed to fetch AI report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/stock/:symbol/chart-data - 獲取診斷線圖所需的 60 日數據
router.get('/stock/:symbol/chart-data', async (req, res) => {
    try {
        const { symbol } = req.params;
        
        // 1. 獲取數據，計算全歷史窗口函數後再擷取近 60 日，確保指標曲線完整
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

        // 反轉數組以按時間順序顯示 (Recharts 需要)
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
// --- AI Prompt Management APIs ---

// GET /api/admin/prompts - 獲取所有提示詞模板列表 (去重)
// ⚠️ 以下 admin 路由需要管理員權限
router.get('/admin/prompts', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const result = await query('SELECT DISTINCT name FROM ai_prompt_templates ORDER BY name');
        res.json({ success: true, data: result.rows.map(r => r.name) });
    } catch (err) {
        console.error('Failed to fetch prompt names:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/admin/prompts/:name - 獲取特定模板的當前生效版本
router.get('/admin/prompts/:name', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.params;
        const result = await query('SELECT * FROM ai_prompt_templates WHERE name = $1 AND is_active = true ORDER BY version DESC LIMIT 1', [name]);
        if (result.rows.length === 0) {
            return res.json({ success: false, message: '未找到生效中的模板' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Failed to fetch active prompt:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/admin/prompts/:name/history - 獲取特定模板的所有版本紀錄
router.get('/admin/prompts/:name/history', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.params;
        const result = await query('SELECT id, version, is_active, note, created_at FROM ai_prompt_templates WHERE name = $1 ORDER BY version DESC', [name]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Failed to fetch prompt history:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/admin/prompts/:name - 建立新版本的模板 (並將其設為生效)
router.post('/admin/prompts/:name', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.params;
        const { content, note } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: '提示詞內容不能為空' });
        }

        // 1. 獲取當前最高版本
        const versionRes = await query('SELECT MAX(version) as current_version FROM ai_prompt_templates WHERE name = $1', [name]);
        const nextVersion = (versionRes.rows[0].current_version || 0) + 1;

        // 2. 將舊的生效版本設為不生效
        await query('UPDATE ai_prompt_templates SET is_active = false WHERE name = $1', [name]);

        // 3. 插入新版本並設為生效
        const result = await query(
            'INSERT INTO ai_prompt_templates (name, content, version, is_active, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, content, nextVersion, true, note || null]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Failed to update prompt:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/admin/prompts/version/:id - 獲取特定 ID 的模板內容
router.get('/admin/prompts/version/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM ai_prompt_templates WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.json({ success: false, message: '未找到該版本的模板' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Failed to fetch specific prompt version:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/admin/prompts/version/:id - 覆蓋特定 ID 的模板內容
router.put('/admin/prompts/version/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { content, note } = req.body;
        if (!content) return res.status(400).json({ success: false, message: '內容不能為空' });

        const result = await query('UPDATE ai_prompt_templates SET content = $1, note = $2 WHERE id = $3 RETURNING *', [content, note || null, id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: '找不到該版本' });
        }
        res.json({ success: true, data: result.rows[0], message: '成功覆蓋版本' });
    } catch (err) {
        console.error('Failed to overwrite prompt version:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/admin/prompts/version/:id - 刪除特定 ID 的模板 (僅允許刪除未生效的版本)
router.delete('/admin/prompts/version/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM ai_prompt_templates WHERE id = $1 AND is_active = false RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: '找不到該版本，或無法刪除正在生效中的版本' });
        }
        res.json({ success: true, message: '版本刪除成功' });
    } catch (err) {
        console.error('Failed to delete prompt version:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/stock/:symbol/generate-ai-report - 手動觸發 AI 報告生成 (需登入)
router.post('/stock/:symbol/generate-ai-report', requireAuth, async (req, res) => {
    try {
        const { symbol } = req.params;
        // 這裡可以檢查權限，暫時允許所有請求
        const result = await generateAIReport(symbol);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (err) {
        console.error('API Generation Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------------------------------
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
            WHERE category = $1
            ORDER BY publish_at DESC
            LIMIT $2
    `;
        const result = await query(sql, [category, parseInt(limit)]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/history/:symbol
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

// GET /api/stocks/search - Autocomplete Search
router.get('/stocks/search', async (req, res) => {
    try {
        const { q = '', limit = 10 } = req.query;
        if (!q) return res.json([]);
        const sql = `
SELECT s.symbol, s.name, s.industry, s.market, p.close_price, p.change_percent, f.pe_ratio, f.pb_ratio, f.dividend_yield, inst.foreign_net / 1000.0 as foreign_net, inst.trust_net / 1000.0 as trust_net, inst.dealer_net / 1000.0 as dealer_net
            FROM stocks s
            LEFT JOIN LATERAL(SELECT close_price, change_percent FROM daily_prices dp WHERE dp.symbol = s.symbol ORDER BY trade_date DESC LIMIT 1) p ON true
            LEFT JOIN LATERAL(SELECT pe_ratio, pb_ratio, dividend_yield FROM fundamentals WHERE symbol = s.symbol ORDER BY trade_date DESC LIMIT 1) f ON true
            LEFT JOIN LATERAL(SELECT foreign_net, trust_net, dealer_net FROM institutional WHERE symbol = s.symbol ORDER BY trade_date DESC LIMIT 1) inst ON true
            WHERE s.symbol LIKE $1 OR s.name LIKE $1
            ORDER BY CASE WHEN s.symbol = $2 THEN 0 WHEN s.symbol LIKE $3 THEN 1 ELSE 2 END, s.symbol LIMIT $4
        `;
        const result = await query(sql, [`%${q}%`, q, `${q}%`, parseInt(limit)]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stock/:symbol/health-check - 個股健診
router.get('/stock/:symbol/health-check', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log(`[DEBUG] Health check requested for: ${symbol} at ${formatTaiwanTime()}`);
        const result = await query('SELECT * FROM stock_health_scores WHERE symbol = $1 ORDER BY calc_date DESC LIMIT 1', [symbol]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: '找不到該個股健診資料' });

        const data = result.rows[0];

        // 輔助函式：生成一段話摘要
        const generateSummary = (d) => {
            const highScores = [];
            const lowScores = [];
            const dims = [
                { name: '獲利能力', score: d.profit_score },
                { name: '成長能力', score: d.growth_score },
                { name: '安全性', score: d.safety_score },
                { name: '價值衡量', score: d.value_score },
                { name: '配息能力', score: d.dividend_score },
                { name: '籌碼面', score: d.chip_score },
                { name: '消息面', score: d.news_score }
            ];

            dims.forEach(dim => {
                if (dim.score >= 70) highScores.push(dim.name);
                else if (dim.score <= 40) lowScores.push(dim.name);
            });

            let summary = `本股綜合評分為 ${d.overall_score} 分，評等為 ${d.grade}。`;
            if (highScores.length > 0) {
                summary += `在 ${highScores.join('、')} 表現優異。`;
            }
            if (lowScores.length > 0) {
                summary += `但需留意 ${lowScores.join('、')} 相對較弱。`;
            }
            if (d.value_score < 40) {
                summary += "目前估值偏高，建議謹慎評估買點。";
            } else if (d.value_score > 70) {
                summary += "目前估值具備吸引力。";
            }
            if (d.chip_score > 70) {
                summary += "近期籌碼面有法人加持，動能較強。";
            }
            if (d.news_score && d.news_score >= 70) {
                summary += "近期新聞消息面偏多，市場關注度高。";
            } else if (d.news_score && d.news_score <= 30) {
                summary += "近期新聞面偏空，需注意利空消息影響。";
            }
            return summary;
        };

        res.json({
            success: true,
            overall: data.overall_score,
            grade: data.grade,
            gradeColor: data.grade_color,
            summary: generateSummary(data),
            dimensions: [
                { name: '獲利能力', score: data.profit_score || 0, weight: 20, detail: '基於 ROE 與毛利率表現（權重 20%）' },
                { name: '成長能力', score: data.growth_score || 0, weight: 15, detail: '基於營收與 EPS 成長率（權重 15%）' },
                { name: '安全性', score: data.safety_score || 0, weight: 7, detail: '基於負債比與流動比率（權重 7%）' },
                { name: '價值衡量', score: data.value_score || 0, weight: 15, detail: '基於 PE/PB 估值位階（權重 15%）' },
                { name: '配息能力', score: data.dividend_score || 0, weight: 10, detail: '基於現金殖利率與配息穩定性（權重 10%）' },
                { name: '籌碼面', score: data.chip_score || 0, weight: 13, detail: '基於法人近期買賣超動向（權重 13%）' },
                { name: '消息面', score: data.news_score || 50, weight: 20, detail: '基於近14日新聞情緒分析（時效加權）（權重 20%）' }
            ],
            metrics: {
                pe: data.pe,
                dy: data.dividend_yield,
                latestROE: data.roe,
                latestGrossMargin: data.gross_margin,
                totalBuy: data.inst_net_buy
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/stocks/compare - 多股比較 (新路徑與完整指標)
router.get(['/stocks/compare', '/compare'], async (req, res) => {
    try {
        const { symbols } = req.query;
        if (!symbols) return res.json({ success: true, data: [] });
        const symbolList = symbols.split(',');
        
        const results = await Promise.all(symbolList.map(async sym => {
            const sql = `
                WITH latest_price AS (
                    SELECT close_price, change_percent 
                    FROM daily_prices 
                    WHERE symbol = $1 
                    ORDER BY trade_date DESC LIMIT 1
                ),
                latest_health AS (
                    SELECT * FROM stock_health_scores
                    WHERE symbol = $1
                    ORDER BY calc_date DESC LIMIT 1
                )
                SELECT 
                    s.symbol, s.name, s.industry, s.market,
                    COALESCE(p.close_price, h.close_price)::numeric as "closePrice",
                    COALESCE(p.change_percent, h.change_percent)::numeric as "changePercent",
                    h.pe, h.pb, 
                    h.dividend_yield as "dividendYield",
                    h.roe, h.gross_margin as "grossMargin",
                    h.revenue_growth as "revenueGrowth",
                    h.avg_cash_dividend as "avgCashDividend",
                    h.inst_net_buy as "instNetBuy5d"
                FROM stocks s
                LEFT JOIN latest_health h ON s.symbol = h.symbol
                LEFT JOIN latest_price p ON s.symbol = p.symbol
                WHERE s.symbol = $1
            `;
            const scoreRes = await query(sql, [sym]);
            return scoreRes.rows[0] || { symbol: sym, error: 'No data' };
        }));
        
        res.json({ success: true, data: results.filter(r => !r.error) });
    } catch (err) {
        console.error('Stock compare error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/health-check-ranking - 全股健診排行
router.get('/health-check-ranking', async (req, res) => {
    try {
        const { 
            sort = 'overall_score', 
            order = 'DESC', 
            industry, 
            market, 
            stock_types, 
            grade, 
            smart_rating,
            minScore = 0, 
            maxScore = 100, 
            page = 1, 
            limit = 50, 
            search,
            filter
        } = req.query;
        const dateRes = await query('SELECT MAX(calc_date) as latest FROM stock_health_scores');
        const latestDate = dateRes.rows[0]?.latest;
        if (!latestDate) return res.json({ success: true, data: [], total: 0 });
        let conditions = ['calc_date = $1', 'overall_score >= $2', 'overall_score <= $3'];
        let params = [latestDate, parseInt(minScore), parseInt(maxScore)];
        let paramIdx = 4;
        if (industry) { conditions.push(`industry = $${paramIdx}`); params.push(industry); paramIdx++; }
        if (market) { conditions.push(`market = $${paramIdx}`); params.push(market); paramIdx++; }
        if (stock_types) {
            const types = stock_types.split(',');
            const typeConditions = [];
            if (types.includes('stock')) typeConditions.push("(symbol ~ '^[0-9]{4}$' AND symbol !~ '^00')");
            if (types.includes('etf')) typeConditions.push("(symbol ~ '^00' OR name ILIKE '%ETF%')");
            if (typeConditions.length > 0) conditions.push(`(${typeConditions.join(' OR ')})`);
        }
        if (grade) { conditions.push(`grade = $${paramIdx}`); params.push(grade); paramIdx++; }
        if (smart_rating) { conditions.push(`smart_rating = $${paramIdx}`); params.push(smart_rating); paramIdx++; }
        if (search) { conditions.push(`(symbol ILIKE $${paramIdx} OR name ILIKE $${paramIdx})`); params.push(`%${search}%`); paramIdx++; }

        // --- Technical Indicator Filters ---
        if (filter) {
            const latestIndicatorDateRes = await query("SELECT TO_CHAR(MAX(trade_date), 'YYYY-MM-DD') as latest FROM indicators");
            const latestIndDate = latestIndicatorDateRes.rows[0]?.latest;
            
            if (latestIndDate) {
                let subQuery = '';
                const baseExist = `EXISTS (SELECT 1 FROM indicators i WHERE i.symbol = stock_health_scores.symbol AND TO_CHAR(i.trade_date, 'YYYY-MM-DD') = '${latestIndDate}' AND `;
                
                switch (filter) {
                    case 'ma20_up':
                        subQuery = `${baseExist} stock_health_scores.close_price > i.ma_20)`;
                        break;
                    case 'ma20_down':
                        subQuery = `${baseExist} stock_health_scores.close_price < i.ma_20)`;
                        break;
                    case 'oversold':
                    case 'rsi_low':
                        subQuery = `${baseExist} i.rsi_14 < 30)`;
                        break;
                    case 'rsi_high':
                        subQuery = `${baseExist} i.rsi_14 > 70)`;
                        break;
                    case 'macd_up':
                        subQuery = `${baseExist} i.macd_hist > 0)`;
                        break;
                    case 'macd_down':
                        subQuery = `${baseExist} i.macd_hist < 0)`;
                        break;
                    case 'kd_gold':
                        // Now using actual K/D values
                        subQuery = `${baseExist} i.k_value > i.d_value AND i.k_value < 50)`;
                        break;
                    case 'kd_death':
                        subQuery = `${baseExist} i.k_value < i.d_value AND i.k_value > 50)`;
                        break;
                    case 'bb_up':
                        // Now using actual Bollinger Upper Band
                        subQuery = `${baseExist} stock_health_scores.close_price > i.upper_band)`;
                        break;
                    case 'bb_down':
                        // Now using actual Bollinger Lower Band
                        subQuery = `${baseExist} stock_health_scores.close_price < i.lower_band)`;
                        break;
                    case 'vol_spike':
                    case 'volume':
                        // Now using actual Volume Ratio
                        subQuery = `${baseExist} i.volume_ratio > 1.5)`;
                        break;
                    case 'ibs_low':
                        subQuery = `${baseExist} i.ibs <= 0.2)`;
                        break;
                    case 'ibs_high':
                        subQuery = `${baseExist} i.ibs >= 0.8)`;
                        break;
                    case 'foreign_buy':
                        subQuery = `EXISTS (SELECT 1 FROM fm_institutional fi WHERE fi.stock_id = stock_health_scores.symbol AND fi.name = 'Foreign_Investors' AND fi.buy > fi.sell AND fi.date = (SELECT MAX(date) FROM fm_institutional))`;
                        break;
                    case 'trust_buy':
                        subQuery = `EXISTS (SELECT 1 FROM fm_institutional fi WHERE fi.stock_id = stock_health_scores.symbol AND fi.name = 'Investment_Trust' AND fi.buy > fi.sell AND fi.date = (SELECT MAX(date) FROM fm_institutional))`;
                        break;
                    case 'foreign_sell':
                        subQuery = `EXISTS (SELECT 1 FROM fm_institutional fi WHERE fi.stock_id = stock_health_scores.symbol AND fi.name = 'Foreign_Investors' AND fi.sell > fi.buy AND fi.date = (SELECT MAX(date) FROM fm_institutional))`;
                        break;
                    case 'trust_sell':
                        subQuery = `EXISTS (SELECT 1 FROM fm_institutional fi WHERE fi.stock_id = stock_health_scores.symbol AND fi.name = 'Investment_Trust' AND fi.sell > fi.buy AND fi.date = (SELECT MAX(date) FROM fm_institutional))`;
                        break;
                    case 'buy':
                        conditions.push("grade = '優秀'");
                        break;
                    case 'sell':
                        conditions.push("grade = '待改善'");
                        break;
                    case 'ibs_low':
                        conditions.push("overall_score >= 65");
                        break;
                    case 'ibs_high':
                        conditions.push("overall_score <= 55");
                        break;
                    default:
                        // No extra condition
                }
                if (subQuery) conditions.push(subQuery);
            }
        }

        const whereClause = conditions.join(' AND ');
        const countRes = await query(`SELECT COUNT(*) as cnt FROM stock_health_scores WHERE ${whereClause}`, params);
        const total = parseInt(countRes.rows[0].cnt);
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);
        // Whitelist allowed sort columns to prevent SQL injection
        const allowedSorts = ['overall_score','profit_score','growth_score','safety_score','value_score','dividend_score','chip_score','news_score','pe','pb','dividend_yield','revenue_growth','eps_growth','close_price','change_percent','smart_score','name','symbol'];
        const safeSort = allowedSorts.includes(sort) ? sort : 'overall_score';
        const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';
        const dataRes = await query(`SELECT * FROM stock_health_scores WHERE ${whereClause} ORDER BY ${safeSort} ${safeOrder} NULLS LAST LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`, params);
        const indRes = await query(`SELECT DISTINCT industry FROM stock_health_scores WHERE calc_date = $1`, [latestDate]);
        
        // Get counts for each smart rating for the latest date
        const smartRatingCountsRes = await query(`
            SELECT smart_rating, COUNT(*) as count 
            FROM stock_health_scores 
            WHERE calc_date = $1 
            GROUP BY smart_rating
        `, [latestDate]);
        
        const smartRatingCounts = {};
        smartRatingCountsRes.rows.forEach(r => {
            if (r.smart_rating) {
                smartRatingCounts[r.smart_rating] = parseInt(r.count);
            }
        });

        // Get counts for each grade for the latest date
        const gradeCountsRes = await query(`
            SELECT grade, COUNT(*) as count 
            FROM stock_health_scores 
            WHERE calc_date = $1 
            GROUP BY grade
        `, [latestDate]);
        
        const gradeCounts = {};
        gradeCountsRes.rows.forEach(r => {
            if (r.grade) {
                gradeCounts[r.grade] = parseInt(r.count);
            }
        });

        res.json({ 
            success: true, 
            data: dataRes.rows, 
            total, 
            industries: indRes.rows.map(r => r.industry),
            calcDate: latestDate,
            smartRatingCounts,
            gradeCounts
        });
    } catch (err) {
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

// GET /api/stock/:symbol/health-history - 獲取歷史健診分數
router.get('/stock/:symbol/health-history', async (req, res) => {
    try {
        const { symbol } = req.params;
        const sql = `SELECT TO_CHAR(calc_date, 'YYYY-MM-DD') as date, overall_score as score FROM stock_health_scores WHERE symbol = $1 ORDER BY calc_date ASC LIMIT 30`;
        const result = await query(sql, [symbol]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// GET /api/health-check/backtest-stats - 獲取智慧評分回測數據
router.get('/health-check/backtest-stats', async (req, res) => {
    try {
        const dateRes = await query(`
            SELECT DISTINCT calc_date 
            FROM stock_health_scores 
            ORDER BY calc_date DESC 
            LIMIT 25
        `);
        
        const dates = dateRes.rows.map(r => {
            const d = new Date(r.calc_date);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        });

        const requestedDays = parseInt(req.query.days, 10);
        const LOOKAHEAD_DAYS = isNaN(requestedDays) ? 3 : requestedDays; // T+N 波段回測

        if (dates.length <= LOOKAHEAD_DAYS) {
            return res.json({ success: true, data: [] });
        }

        const stats = [];
        for (let i = 0; i < Math.min(dates.length - LOOKAHEAD_DAYS, 5); i++) {
            const currDate = dates[i + LOOKAHEAD_DAYS]; // 評估起點 (T=0)
            const nextDate = dates[i];                  // 回測終點 (T+3)

            // Find actual trade dates closest to calc_dates from daily_prices
            const actualDatesRes = await query(`
                SELECT 
                    (SELECT MAX(TO_CHAR(trade_date, 'YYYY-MM-DD')) FROM daily_prices WHERE TO_CHAR(trade_date, 'YYYY-MM-DD') <= $1 AND symbol = 'TAIEX') as prev_trade_date,
                    (SELECT MAX(TO_CHAR(trade_date, 'YYYY-MM-DD')) FROM daily_prices WHERE TO_CHAR(trade_date, 'YYYY-MM-DD') <= $2 AND symbol = 'TAIEX') as curr_trade_date
            `, [currDate, nextDate]);
            const prevTradeDate = actualDatesRes.rows[0]?.prev_trade_date || currDate;
            const currTradeDate = actualDatesRes.rows[0]?.curr_trade_date || nextDate;

            // Skip if both dates resolve to the same trade date (no new price data)
            if (prevTradeDate === currTradeDate) continue;

            // Fetch TAIEX performance for benchmark
            const taiexRes = await query(`
                WITH p AS (SELECT close_price FROM daily_prices WHERE symbol = 'TAIEX' AND TO_CHAR(trade_date, 'YYYY-MM-DD') = $1),
                     c AS (SELECT close_price FROM daily_prices WHERE symbol = 'TAIEX' AND TO_CHAR(trade_date, 'YYYY-MM-DD') = $2)
                SELECT ((c.close_price - p.close_price) / p.close_price * 100) as taiex_return
                FROM p, c
            `, [prevTradeDate, currTradeDate]);
            const taiexReturn = taiexRes.rows[0]?.taiex_return || 0;

            // Use daily_prices for actual price comparison (more reliable than snapshot)
            const perfRes = await query(`
                WITH prev_scores AS (
                    SELECT symbol, smart_rating, grade
                    FROM stock_health_scores
                    WHERE calc_date = $1
                ),
                prev_prices AS (
                    SELECT symbol, close_price
                    FROM daily_prices
                    WHERE TO_CHAR(trade_date, 'YYYY-MM-DD') = $2
                ),
                curr_prices AS (
                    SELECT symbol, close_price
                    FROM daily_prices
                    WHERE TO_CHAR(trade_date, 'YYYY-MM-DD') = $3
                )
                SELECT 
                    ps.smart_rating,
                    ps.grade,
                    COUNT(*) as count,
                    ROUND(AVG((cp.close_price - pp.close_price) / pp.close_price * 100), 2) as avg_return_pct,
                    ROUND(COUNT(CASE WHEN cp.close_price > pp.close_price THEN 1 END) * 100.0 / COUNT(*), 2) as win_rate_pct,
                    ROUND(COUNT(CASE WHEN (cp.close_price - pp.close_price) / pp.close_price * 100 > $4 THEN 1 END) * 100.0 / COUNT(*), 2) as active_win_rate_pct
                FROM prev_scores ps
                JOIN prev_prices pp ON ps.symbol = pp.symbol
                JOIN curr_prices cp ON ps.symbol = cp.symbol
                WHERE pp.close_price > 0
                GROUP BY GROUPING SETS ((ps.smart_rating), (ps.grade))
            `, [currDate, prevTradeDate, currTradeDate, taiexReturn]);

            if (perfRes.rows.length > 5) {
                stats.push({
                    recommend_date: currDate,
                    test_date: nextDate,
                    taiex_return: taiexReturn ? parseFloat(Number(taiexReturn).toFixed(2)) : 0,
                    metrics: perfRes.rows
                });
            }
        }

        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/health-check/backtest-category-stocks - 獲取回測類別下的個股清單
router.get('/health-check/backtest-category-stocks', async (req, res) => {
    const { recommend_date, test_date, category, type } = req.query;
    try {
        let whereClause = '';
        if (type === 'rating') whereClause = 'p.smart_rating = $3';
        else if (type === 'grade') whereClause = 'p.grade = $3';
        else if (type === 'dimension') {
            // For dimension scores (profit_score, etc), we show high-score stocks
            const validDimensions = ['profit_score', 'growth_score', 'safety_score', 'value_score', 'dividend_score', 'chip_score', 'overall_score'];
            if (!validDimensions.includes(category)) throw new Error('Invalid dimension');
            whereClause = `p.${category} >= 75`;
        } else {
            throw new Error('Invalid query type');
        }
        
        const sql = `
            WITH prev AS (
                SELECT symbol, name, close_price as p0, smart_rating, grade, profit_score, growth_score, safety_score, value_score, dividend_score, chip_score, overall_score
                FROM stock_health_scores
                WHERE calc_date = $1
            ),
            curr AS (
                SELECT symbol, close_price as p1
                FROM stock_health_scores
                WHERE calc_date = $2
            )
            SELECT 
                p.symbol, p.name, p.smart_rating, p.grade, p.overall_score,
                p.p0 as recommend_price,
                c.p1 as test_price,
                ROUND(((c.p1 - p.p0) / p.p0 * 100), 2) as return_pct
            FROM prev p
            JOIN curr c ON p.symbol = c.symbol
            WHERE ${whereClause} AND p.p0 > 0
            ORDER BY return_pct DESC
            LIMIT 100
        `;
        const result = await query(sql, [recommend_date, test_date, category]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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

// GET /api/debug-db - 除錯用：檢查資料庫連線與資料量
router.get('/debug-db', async (req, res) => {
    try {
        const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'Not Set';
        const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
        
        const counts = await Promise.all([
            query('SELECT count(*) FROM daily_prices').catch(e => ({ error: e.message })),
            query('SELECT count(*) FROM stocks').catch(e => ({ error: e.message })),
            query('SELECT count(*) FROM stock_health_scores').catch(e => ({ error: e.message })),
            query('SELECT count(*) FROM market_focus_daily').catch(e => ({ error: e.message }))
        ]);

        const latestPrices = await query(`
            SELECT trade_date, count(*) as count
            FROM daily_prices
            WHERE trade_date IN (
                SELECT DISTINCT trade_date FROM daily_prices ORDER BY trade_date DESC LIMIT 5
            )
            GROUP BY trade_date
            ORDER BY trade_date DESC
        `).catch(e => ({ error: e.message }));

        res.json({
            success: true,
            env: {
                DATABASE_URL: maskedUrl,
                VERCEL: process.env.VERCEL,
                NODE_ENV: process.env.NODE_ENV
            },
            counts: {
                daily_prices: counts[0].rows ? counts[0].rows[0].count : counts[0].error,
                stocks: counts[1].rows ? counts[1].rows[0].count : counts[1].error,
                health_scores: counts[2].rows ? counts[2].rows[0].count : counts[2].error,
                market_focus: counts[3].rows ? counts[3].rows[0].count : counts[3].error
            },
            latest_prices_distribution: latestPrices.rows || latestPrices.error
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 持倉分析 API ====================

const { requireAuth: posAuth } = require('../middleware/auth');

// Helper: 取得使用者自訂權重 (若有登入且有設定)
async function getUserWeights(req) {
    try {
        if (req.user && req.user.id) {
            const res = await query(
                'SELECT tech_weight, fund_weight, chip_weight, mom_weight FROM user_analysis_settings WHERE user_id = $1',
                [req.user.id]
            );
            if (res.rows.length > 0) {
                const r = res.rows[0];
                return {
                    technical: parseFloat(r.tech_weight),
                    fundamental: parseFloat(r.fund_weight),
                    chip: parseFloat(r.chip_weight),
                    momentum: parseFloat(r.mom_weight)
                };
            }
        }
    } catch (e) {
        // Silent fallback to defaults
    }
    return null;
}

// 可選認證中間件 — 嘗試解析 token 但不強制要求
function optionalAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        try {
            const jwt = require('jsonwebtoken');
            const token = auth.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
            req.user = decoded;
        } catch (e) {
            // Token invalid, proceed without user
        }
    }
    next();
}

// GET /api/position/analyze/:symbol — 單一股票持倉分析
router.get('/position/analyze/:symbol', optionalAuth, async (req, res) => {
    try {
        const { symbol } = req.params;
        const customWeights = await getUserWeights(req);
        const result = await analyzePosition(symbol, customWeights);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Position analyze error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/position/analyze-batch — 批量股票持倉分析
router.post('/position/analyze-batch', optionalAuth, async (req, res) => {
    try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ success: false, error: '請提供股票代號陣列' });
        }
        // Limit to 30 symbols at a time
        const limitedSymbols = symbols.slice(0, 30);
        const customWeights = await getUserWeights(req);
        const results = await analyzeMultiple(limitedSymbols, customWeights);
        res.json({ success: true, data: results });
    } catch (err) {
        console.error('Position batch analyze error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/position/settings — 取得使用者分析權重設定
router.get('/position/settings', posAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT tech_weight, fund_weight, chip_weight, mom_weight, updated_at FROM user_analysis_settings WHERE user_id = $1',
            [req.user.id]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            // 回傳預設值
            res.json({
                success: true,
                data: {
                    tech_weight: 0.30,
                    fund_weight: 0.25,
                    chip_weight: 0.25,
                    mom_weight: 0.20,
                    updated_at: null
                }
            });
        }
    } catch (err) {
        console.error('Get analysis settings error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/position/settings — 更新使用者分析權重設定
router.post('/position/settings', posAuth, async (req, res) => {
    try {
        const { tech_weight, fund_weight, chip_weight, mom_weight } = req.body;
        
        // 驗證權重
        const weights = [
            parseFloat(tech_weight) || 0,
            parseFloat(fund_weight) || 0,
            parseFloat(chip_weight) || 0,
            parseFloat(mom_weight) || 0
        ];
        
        if (weights.some(w => w < 0 || w > 1)) {
            return res.status(400).json({ success: false, error: '權重必須介於 0 到 1 之間' });
        }
        
        const sum = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1) > 0.05) {
            return res.status(400).json({ success: false, error: `權重總和必須為 1 (目前: ${sum.toFixed(2)})` });
        }

        await query(`
            INSERT INTO user_analysis_settings (user_id, tech_weight, fund_weight, chip_weight, mom_weight, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                tech_weight = EXCLUDED.tech_weight,
                fund_weight = EXCLUDED.fund_weight,
                chip_weight = EXCLUDED.chip_weight,
                mom_weight = EXCLUDED.mom_weight,
                updated_at = NOW()
        `, [req.user.id, weights[0], weights[1], weights[2], weights[3]]);

        res.json({ success: true, message: '權重設定已更新' });
    } catch (err) {
        console.error('Update analysis settings error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/position/history/:symbol — 取得個股歷史評分走勢
router.get('/position/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days = 30 } = req.query;
        const result = await query(`
            SELECT 
                TO_CHAR(calc_date, 'YYYY-MM-DD') as date,
                overall_score, tech_score, fund_score, chip_score, mom_score,
                recommendation, signal
            FROM stock_daily_analysis_results
            WHERE symbol = $1
            ORDER BY calc_date DESC
            LIMIT $2
        `, [symbol, parseInt(days)]);
        
        // 倒序回傳 (日期由舊到新)
        res.json({ success: true, data: result.rows.reverse() });
    } catch (err) {
        console.error('Position history error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/diag/time - 診斷伺服器時間與時區
router.get('/diag/time', (req, res) => {
    res.json({
        success: true,
        serverTime: new Date().toISOString(),
        taiwanTime: formatTaiwanTime(),
        envTZ: process.env.TZ || 'Not Set',
        configTZ: TZ
    });
});

module.exports = router;


