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