const { GoogleGenerativeAI } = require("@google/generative-ai");
const { pool } = require('../db');
const { db, schema } = require('../db/drizzle');
const { cosineDistance, sql } = require('drizzle-orm');
const { getTaiwanDate, formatTaiwanTime } = require('./timeUtils');
const SentimentAggregator = require('./sentiment_aggregator');
const logger = require('./logger');
const query = (text, params) => pool.query(text, params);
require("dotenv").config();

// --- 多金鑰輪詢管理（含 403 自動過濾）---
let genAIPool = [];
let apiKeys = [];
let currentKeyIndex = 0;
const blockedKeyIndices = new Set(); // 記錄 403 的金鑰索引
let lastKeyFetchTime = 0;
const KEY_FETCH_INTERVAL = 60 * 1000; // 1分鐘快取

async function refreshApiKeys() {
    const now = Date.now();
    if (now - lastKeyFetchTime < KEY_FETCH_INTERVAL && genAIPool.length > 0) {
        return;
    }
    try {
        const res = await pool.query("SELECT id, api_key FROM system_api_keys WHERE service_name = 'gemini' AND is_active = true ORDER BY id");
        if (res.rows.length > 0) {
            const newKeys = res.rows.map(r => ({ id: r.id, key: r.api_key }));
            // 若金鑰有變更才重新初始化
            if (JSON.stringify(newKeys) !== JSON.stringify(apiKeys)) {
                logger.info(`[AI Service] Reloaded API keys from DB. Active keys: ${newKeys.length}`);
                apiKeys = newKeys;
                genAIPool = apiKeys.map(k => new GoogleGenerativeAI(k.key));
                blockedKeyIndices.clear();
                currentKeyIndex = 0;
            }
        } else {
            logger.warn('[AI Service] No active Gemini keys found in database.');
        }
        lastKeyFetchTime = now;
    } catch (err) {
        logger.error(`[AI Service] Failed to fetch keys from DB: ${err.message}`);
    }
}

async function getGenAIInstanceAsync() {
    await refreshApiKeys();
    if (genAIPool.length === 0) return null;
    
    // 嘗試找到未被封鎖的金鑰
    for (let attempt = 0; attempt < genAIPool.length; attempt++) {
        const idx = currentKeyIndex;
        currentKeyIndex = (currentKeyIndex + 1) % genAIPool.length;
        if (!blockedKeyIndices.has(idx)) {
            const instance = genAIPool[idx];
            const keyObj = apiKeys[idx];
            const keyHint = keyObj.key.substring(0, 8) + '...';
            return { instance, keyHint, keyIndex: idx, dbId: keyObj.id };
        }
    }
    // 所有金鑰均被封鎖，嘗試重置
    logger.warn('[AI Service] All keys blocked, resetting blocklist and retrying...');
    blockedKeyIndices.clear();
    const instance = genAIPool[currentKeyIndex];
    const keyObj = apiKeys[currentKeyIndex];
    const keyHint = keyObj.key.substring(0, 8) + '...';
    return { instance, keyHint, keyIndex: currentKeyIndex, dbId: keyObj.id };
}

// 非同步寫入指標，避免阻塞主流程
function updateKeyMetrics(dbId, isSuccess, is429, latencyMs) {
    if (!dbId) return;
    const sql = `
        UPDATE system_api_keys 
        SET invoke_count = invoke_count + 1,
            success_count = success_count + $1,
            error_429_count = error_429_count + $2,
            total_latency_ms = total_latency_ms + $3
        WHERE id = $4
    `;
    pool.query(sql, [isSuccess ? 1 : 0, is429 ? 1 : 0, latencyMs, dbId]).catch(err => {
        logger.error(`[AI Service] Failed to update key metrics for id ${dbId}: ${err.message}`);
    });
}

function markKeyBlocked(keyIndex) {
    if (keyIndex !== undefined) {
        blockedKeyIndices.add(keyIndex);
        logger.warn(`[AI Service] Key index ${keyIndex} blocked (403). Active keys: ${genAIPool.length - blockedKeyIndices.size}/${genAIPool.length}`);
    }
}
// ----------------------


/**
 * Format news items grouped by recency for LLM prompt
 */
function formatNewsWithRecency(news, now) {
    if (!news || news.length === 0) return '近期新聞: 無相關新聞';

    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const h72 = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const recent24h = news.filter(n => new Date(n.publish_at) >= h24);
    const recent72h = news.filter(n => { const d = new Date(n.publish_at); return d < h24 && d >= h72; });
    const older = news.filter(n => new Date(n.publish_at) < h72);

    let output = '';
    if (recent24h.length > 0) {
        output += `🔴 最近24小時重要新聞 (對明日開盤影響最大):\n`;
        output += recent24h.slice(0, 5).map(n => `- [${new Date(n.publish_at).toLocaleString('zh-TW')}] ${n.title}`).join('\n');
        output += '\n\n';
    }
    if (recent72h.length > 0) {
        output += `🟡 近1-3天新聞:\n`;
        output += recent72h.slice(0, 3).map(n => `- [${new Date(n.publish_at).toLocaleString('zh-TW')}] ${n.title}`).join('\n');
        output += '\n\n';
    }
    if (older.length > 0 && recent24h.length + recent72h.length < 3) {
        output += `⚪ 較早期新聞 (參考用):\n`;
        output += older.slice(0, 2).map(n => `- [${new Date(n.publish_at).toLocaleString('zh-TW')}] ${n.title}`).join('\n');
        output += '\n';
    }
    return output || '近期新聞: 無相關新聞';
}

/**
 * Gather deep context for AI or Smart Engine
 */
/**
 * Safe value formatter - handles null/undefined/NaN gracefully
 */
function sv(val, suffix = '', fallback = '無資料') {
    if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) return fallback;
    const str = typeof val === 'number' ? val.toFixed(2) : String(val);
    return str + suffix;
}

async function gatherStockContext(symbol) {
    try {
        // Determine which institutional table to use based on current year
        const currentYear = new Date().getFullYear();
        const instTable = `institutional_${currentYear}`;

        const [stockRes, priceRes, priceHistRes, fundamentalRes, instRes, instDailyRes, marginRes, revenueRes, newsRes, epsRes, finMetricsRes, realtimeRes, etfRes, indRes] = await Promise.all([
            query(`SELECT name, industry FROM stocks WHERE symbol = $1`, [symbol]),
            // Latest price with ALL indicator fields
            query(
                `SELECT p.trade_date, p.open_price, p.high_price, p.low_price, p.close_price,
                        p.change_amount, p.change_percent, p.volume, p.trade_value, p.transactions,
                        i.rsi_14, i.macd_value, i.macd_signal, i.macd_hist, 
                        i.ma_5, i.ma_10, i.ma_20, i.ma_60, 
                        i.k_value, i.d_value, i.upper_band, i.lower_band,
                        i.volume_ratio, i.ibs, i.patterns
                 FROM daily_prices p
                 LEFT JOIN indicators i ON p.symbol = i.symbol AND p.trade_date = i.trade_date
                 WHERE p.symbol = $1
                 ORDER BY p.trade_date DESC
                 LIMIT 1`,
                [symbol]
            ),
            // Historical price trend (last 10 trading days) for trend context
            query(
                `SELECT trade_date, close_price, volume, change_percent
                 FROM daily_prices
                 WHERE symbol = $1
                 ORDER BY trade_date DESC
                 LIMIT 10`,
                [symbol]
            ),
            query(
                `SELECT * FROM fundamentals WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
                [symbol]
            ),
            // 5-day institutional aggregate
            query(
                `SELECT 
                    SUM(foreign_net) as foreign_sum, 
                    SUM(trust_net) as trust_sum, 
                    SUM(dealer_net) as dealer_sum 
                 FROM (SELECT * FROM ${instTable} WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 5) t`,
                [symbol]
            ),
            // Daily institutional breakdown (last 5 days)
            query(
                `SELECT trade_date, foreign_net, trust_net, dealer_net
                 FROM ${instTable} WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 5`,
                [symbol]
            ),
            // 5-day Margin trading
            query(
                `SELECT date, margin_purchase_today_balance, short_sale_today_balance 
                 FROM fm_margin_trading WHERE stock_id = $1 ORDER BY date DESC LIMIT 5`,
                [symbol]
            ),
            query(
                `SELECT revenue, revenue_month, revenue_year, 
                    (SELECT revenue FROM monthly_revenue WHERE symbol = $1 AND revenue_month = r.revenue_month AND revenue_year = r.revenue_year - 1) as prev_y_revenue
                 FROM monthly_revenue r WHERE symbol = $1 ORDER BY revenue_year DESC, revenue_month DESC LIMIT 1`,
                [symbol]
            ),
            (async () => {
                try {
                    const queryText = `${symbol} 的最新營運狀況、財報亮點、重大事件與未來展望`;
                    const { instance: genAI } = await getGenAIInstanceAsync();
                    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
                    const embeddingResult = await model.embedContent(queryText);
                    const queryEmbedding = embeddingResult.embedding.values;

                    const results = await db.select({
                        title: schema.news.title,
                        summary: schema.news.summary,
                        publish_at: schema.news.publish_at
                    })
                    .from(schema.news)
                    .where(sql`${schema.news.embedding} IS NOT NULL`)
                    .orderBy(cosineDistance(schema.news.embedding, queryEmbedding))
                    .limit(10);
                    
                    if (results.length === 0) {
                        // Fallback if no embeddings
                        return await query(
                            `SELECT title, summary, publish_at 
                             FROM news 
                             WHERE (title ILIKE $1 OR summary ILIKE $1)
                               AND publish_at >= NOW() - INTERVAL '7 days'
                             ORDER BY publish_at DESC 
                             LIMIT 10`,
                            [`%${symbol}%`]
                        );
                    }
                    return { rows: results };
                } catch (err) {
                    logger.warn(`[RAG] Failed to vector search for ${symbol}, falling back: ${err.message}`);
                    return await query(
                        `SELECT title, summary, publish_at 
                         FROM news 
                         WHERE (title ILIKE $1 OR summary ILIKE $1)
                           AND publish_at >= NOW() - INTERVAL '7 days'
                         ORDER BY publish_at DESC 
                         LIMIT 10`,
                        [`%${symbol}%`]
                    );
                }
            })(),
            // EPS trend (last 4 quarters)
            query(
                `SELECT date, value FROM financial_statements 
                 WHERE symbol = $1 AND type = 'EPS' 
                 ORDER BY date DESC LIMIT 4`,
                [symbol]
            ),
            // Key financial metrics (latest quarter)
            query(
                `SELECT item, value FROM fm_financial_statements 
                 WHERE stock_id = $1 AND item IN ('ROE','ROA','DebtRatio','GrossProfitMargin','NetIncomeMargin','基本每股盈餘（元）')
                 AND date = (SELECT MAX(date) FROM fm_financial_statements WHERE stock_id = $1 AND item = 'ROE')`,
                [symbol]
            ),
            // Intraday realtime ticks
            query(
                `SELECT buy_intensity, sell_intensity 
                 FROM realtime_ticks_history 
                 WHERE symbol = $1 
                 ORDER BY trade_time DESC 
                 LIMIT 1`,
                [symbol]
            ).catch(() => ({ rows: [] })),
            // ETF Health Scores
            query(
                `SELECT overall_score, trend_score, popularity_score, yield_score, flow_score, technical_score, dividend_yield 
                 FROM etf_health_scores WHERE symbol = $1 ORDER BY calc_date DESC LIMIT 1`,
                [symbol]
            ).catch(() => ({ rows: [] })),
            // Industry Peers
            query(`
                SELECT AVG(pe_ratio) as ind_pe, AVG(pb_ratio) as ind_pb, AVG(dividend_yield) as ind_yield
                FROM fundamentals f
                JOIN stocks s ON f.symbol = s.symbol
                WHERE s.industry = (SELECT industry FROM stocks WHERE symbol = $1 LIMIT 1)
                  AND f.trade_date = (SELECT MAX(trade_date) FROM fundamentals)
            `, [symbol]).catch(() => ({ rows: [] }))
        ]);

        const stockInfo = stockRes.rows[0] || { name: '', industry: '' };
        const priceData = priceRes.rows[0] || {};
        const priceHistory = priceHistRes.rows || [];
        const fundamentals = fundamentalRes.rows[0] || {};
        const institutional = instRes.rows[0] || { foreign_sum: 0, trust_sum: 0, dealer_sum: 0 };
        const instDaily = instDailyRes.rows || [];
        const marginDaily = marginRes.rows || [];
        const margin = marginDaily[0] || { margin_purchase_today_balance: 0, short_sale_today_balance: 0 };
        const revenue = revenueRes.rows[0] || {};
        const news = newsRes.rows;
        const epsHistory = epsRes.rows || [];
        const finMetrics = {};
        (finMetricsRes.rows || []).forEach(r => { finMetrics[r.item] = parseFloat(r.value); });
        const realtime = realtimeRes.rows[0] || {};
        const etfData = etfRes.rows[0] || null;
        const industryAverages = indRes.rows[0] || {};

        // 取得量化的新聞情緒匯總 (近 3 天)
        const newsSentiment = await SentimentAggregator.getAggregatedSentiment(symbol, 3);

        return {
            symbol,
            name: stockInfo.name,
            industry: stockInfo.industry,
            priceData,
            priceHistory,
            fundamentals,
            institutional,
            instDaily,
            margin,
            marginDaily,
            revenue,
            news,
            newsSentiment,
            epsHistory,
            finMetrics,
            realtime,
            etfData,
            industryAverages,
            generatedAt: formatTaiwanTime(),
        };
    } catch (err) {
        console.error("Error gathering stock context:", err);
        throw err;
    }
}

/**
 * Build enriched data section for AI prompt - comprehensive stock data with null handling
 */
function buildEnrichedDataSection(context) {
    const p = context.priceData;
    const f = context.fundamentals;
    const inst = context.institutional;
    const m = context.margin;
    const rev = context.revenue;
    const fm = context.finMetrics || {};
    const rt = context.realtime || {};
    const ind = context.industryAverages || {};

    const inst_total = parseFloat(inst.foreign_sum || 0) + parseFloat(inst.trust_sum || 0);
    const inst_dir = inst_total > 0 ? "偏多買進" : "偏空賣出";

    // Volume formatting
    const vol = parseFloat(p.volume || 0);
    const volStr = vol > 0 ? `${(vol / 1000).toLocaleString(undefined, {maximumFractionDigits: 0})} 張` : '無資料';

    // Price history trend (最近10日)
    let trendSection = '';
    if (context.priceHistory && context.priceHistory.length > 1) {
        const rows = context.priceHistory.slice(0, 10).reverse(); // oldest first
        trendSection = `\\n【近期價格走勢】(由舊到新)\\n`;
        trendSection += rows.map(r => {
            const d = new Date(r.trade_date).toLocaleDateString('zh-TW');
            const chg = parseFloat(r.change_percent || 0);
            const v = parseFloat(r.volume || 0);
            return `${d}: 收${r.close_price} (${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%) 量${(v/1000).toLocaleString(undefined,{maximumFractionDigits:0})}張`;
        }).join('\\n');
    }

    // Institutional daily breakdown
    let instDailySection = '';
    if (context.instDaily && context.instDaily.length > 0) {
        instDailySection = `\\n法人逐日買賣超(近${context.instDaily.length}日):\\n`;
        instDailySection += context.instDaily.slice().reverse().map(d => {
            const date = new Date(d.trade_date).toLocaleDateString('zh-TW');
            const fNet = Math.round(parseFloat(d.foreign_net || 0) / 1000);
            const tNet = Math.round(parseFloat(d.trust_net || 0) / 1000);
            const dNet = Math.round(parseFloat(d.dealer_net || 0) / 1000);
            return `${date}: 外資${fNet >= 0 ? '+' : ''}${fNet}張 投信${tNet >= 0 ? '+' : ''}${tNet}張 自營${dNet >= 0 ? '+' : ''}${dNet}張`;
        }).join('\\n');
    }

    // Margin Trend (5 days)
    let marginSection = '';
    if (context.marginDaily && context.marginDaily.length >= 2) {
        const latest = context.marginDaily[0];
        const oldest = context.marginDaily[context.marginDaily.length - 1];
        const marginDiff = parseFloat(latest.margin_purchase_today_balance) - parseFloat(oldest.margin_purchase_today_balance);
        const shortDiff = parseFloat(latest.short_sale_today_balance) - parseFloat(oldest.short_sale_today_balance);
        marginSection = `\\n融資券近${context.marginDaily.length}日趨勢: 融資${marginDiff >= 0 ? '增加' : '減少'} ${Math.abs(marginDiff)} 張 | 融券${shortDiff >= 0 ? '增加' : '減少'} ${Math.abs(shortDiff)} 張`;
    }

    // Bollinger %b with null safety
    const upperBand = parseFloat(p.upper_band);
    const lowerBand = parseFloat(p.lower_band);
    const closeP = parseFloat(p.close_price);
    const bPercent = (upperBand - lowerBand) > 0 ? ((closeP - lowerBand) / (upperBand - lowerBand)).toFixed(2) : '無資料';

    const dataDate = p.trade_date ? new Date(p.trade_date).toLocaleDateString('zh-TW') : '未知';
    
    // Intraday Data
    let intradaySection = '';
    if (rt.buy_intensity !== undefined && rt.sell_intensity !== undefined) {
        intradaySection = `\\n盤中買賣力道: 買盤強度 ${sv(parseFloat(rt.buy_intensity), '%', '0')} | 賣盤強度 ${sv(parseFloat(rt.sell_intensity), '%', '0')}`;
    }

    // Base info string
    let output = `股票: ${context.name} (${context.symbol}) | 產業: ${context.industry || '未知'}\\n資料日期: ${dataDate}\\n\\n`;

    output += `【價格資訊】\\n`;
    output += `最新收盤: ${sv(closeP)} 元 (漲跌: ${sv(parseFloat(p.change_amount))} 元, ${sv(parseFloat(p.change_percent),'%')})\\n`;
    output += `開盤: ${sv(parseFloat(p.open_price))} | 最高: ${sv(parseFloat(p.high_price))} | 最低: ${sv(parseFloat(p.low_price))}\\n`;
    output += `成交量: ${volStr} | 成交值: ${sv(parseFloat(p.trade_value || 0) > 0 ? (parseFloat(p.trade_value)/100000000).toFixed(2) : NaN, '億')}`;
    output += trendSection + '\\n\\n';

    output += `【技術指標】\\n`;
    output += `均線: MA5=${sv(parseFloat(p.ma_5))} | MA10=${sv(parseFloat(p.ma_10))} | MA20=${sv(parseFloat(p.ma_20))} | MA60=${sv(parseFloat(p.ma_60))}\\n`;
    output += `RSI14: ${sv(parseFloat(p.rsi_14))} | KD: K=${sv(parseFloat(p.k_value))}, D=${sv(parseFloat(p.d_value))}\\n`;
    output += `MACD: 值=${sv(parseFloat(p.macd_value))} | 訊號=${sv(parseFloat(p.macd_signal))} | 柱狀=${sv(parseFloat(p.macd_hist))}\\n`;
    output += `布林通道: 上軌=${sv(upperBand)} | 下軌=${sv(lowerBand)} | %B=${bPercent}\\n`;
    output += `量比(今日/5日均量): ${sv(parseFloat(p.volume_ratio),'倍')}\\n`;
    output += `K線型態: ${p.patterns && p.patterns.length > 0 ? p.patterns.join('、') : '無明確型態'}`;
    output += intradaySection + '\\n\\n';

    // ETF vs Stock Branching
    output += `【基本面】\\n`;
    const isETF = context.industry === 'ETF' || (context.etfData && context.etfData.overall_score);
    if (isETF) {
        const etf = context.etfData || {};
        output += `這是一檔 ETF。評分數據:\\n`;
        output += `總合評分: ${sv(etf.overall_score)} | 趨勢評分: ${sv(etf.trend_score)} | 人氣評分: ${sv(etf.popularity_score)}\\n`;
        output += `流動性評分: ${sv(etf.flow_score)} | 技術面評分: ${sv(etf.technical_score)}\\n`;
        output += `殖利率: ${sv(parseFloat(etf.dividend_yield), '%')} (殖利率評分: ${sv(etf.yield_score)})\\n`;
    } else {
        // Industry Comparison
        let indStr = '';
        if (ind.ind_pe !== undefined) {
            indStr = ` (同業平均 PE: ${parseFloat(ind.ind_pe).toFixed(1)}倍, PB: ${parseFloat(ind.ind_pb).toFixed(1)}倍)`;
        }
        
        // EPS trend
        let epsSection = '';
        if (context.epsHistory && context.epsHistory.length > 0) {
            epsSection = `\\nEPS歷史(近${context.epsHistory.length}季): ` + 
                context.epsHistory.slice().reverse().map(e => {
                    const q = new Date(e.date);
                    return `${q.getFullYear()}Q${Math.ceil((q.getMonth()+1)/3)}=${e.value}元`;
                }).join(' → ');
        }
        
        // Financial metrics
        let finSection = '';
        const finItems = [];
        if (fm.ROE !== undefined && !isNaN(fm.ROE)) finItems.push(`ROE=${fm.ROE.toFixed(2)}%`);
        if (fm.ROA !== undefined && !isNaN(fm.ROA)) finItems.push(`ROA=${fm.ROA.toFixed(2)}%`);
        if (fm.GrossProfitMargin !== undefined && !isNaN(fm.GrossProfitMargin)) finItems.push(`毛利率=${fm.GrossProfitMargin.toFixed(2)}%`);
        if (fm.NetIncomeMargin !== undefined && !isNaN(fm.NetIncomeMargin)) finItems.push(`淨利率=${fm.NetIncomeMargin.toFixed(2)}%`);
        if (fm.DebtRatio !== undefined && !isNaN(fm.DebtRatio)) finItems.push(`負債比=${fm.DebtRatio.toFixed(2)}%`);
        if (finItems.length > 0) finSection = `\\n財務指標(最新季): ${finItems.join(', ')}`;
        
        // YoY calculation
        const yoyStr = rev.prev_y_revenue 
            ? ((parseFloat(rev.revenue) / parseFloat(rev.prev_y_revenue) - 1) * 100).toFixed(1) + '%'
            : '無資料';

        output += `PE=${sv(parseFloat(f.pe_ratio),'倍')} | PB=${sv(parseFloat(f.pb_ratio),'倍')} | 殖利率=${sv(parseFloat(f.dividend_yield),'%')}${indStr}${epsSection}${finSection}\\n`;
        output += `營收: ${rev.revenue_month ? rev.revenue_year + '年' + rev.revenue_month + '月' : '最新'}營收 ${parseFloat(rev.revenue) > 0 ? (parseFloat(rev.revenue) / 100000000).toFixed(2) + '億' : sv(parseFloat(rev.revenue))} (YoY: ${yoyStr})\\n`;
    }

    output += `\\n【籌碼面】\\n`;
    output += `法人5日合計: 外資=${Math.round(parseFloat(inst.foreign_sum || 0) / 1000)}張 | 投信=${Math.round(parseFloat(inst.trust_sum || 0) / 1000)}張 | 自營=${Math.round(parseFloat(inst.dealer_sum || 0) / 1000)}張 → ${inst_dir}${instDailySection}\\n`;
    output += `當日融資餘額: ${sv(parseFloat(m.margin_purchase_today_balance),'張')} | 當日融券餘額: ${sv(parseFloat(m.short_sale_today_balance),'張')}${marginSection}`;

    return output;
}

/**
 * Smart Analysis Engine - Replicates the "Very Good" High-Fidelity Report tone.
 */
function generateSmartEngineReport(symbol, context, promptTemplate) {
    // 1. Core Logic & States
    const close = parseFloat(context.priceData.close_price || 0);
    const ma5 = parseFloat(context.priceData.ma_5 || 0);
    const ma20 = parseFloat(context.priceData.ma_20 || 0);
    const ma60 = parseFloat(context.priceData.ma_60 || 0);
    const rsi = parseFloat(context.priceData.rsi_14 || 50);
    const upper = parseFloat(context.priceData.upper_band || 0);
    const lower = parseFloat(context.priceData.lower_band || 0);
    const macd_hist = parseFloat(context.priceData.macd_hist || 0);
    
    // Derived Technical States
    const ma_bullish = ma5 > ma20 && ma20 > ma60;
    const is_rebound = close > ma20;
    const b_percent = (upper - lower) > 0 ? (close - lower) / (upper - lower) : 0.5;
    const vol = parseFloat(context.priceData.volume || 0);
    const volK = (vol / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 });
    
    // Fundamental Data
    const pe = parseFloat(context.fundamentals.pe_ratio || 0);
    const pb = parseFloat(context.fundamentals.pb_ratio || 0);
    const yield_val = parseFloat(context.fundamentals.dividend_yield || 0);
    const y_rev = parseFloat(context.revenue.revenue || 0);
    const py_rev = parseFloat(context.revenue.prev_y_revenue || 0);
    const yoy = py_rev > 0 ? ((y_rev / py_rev - 1) * 100).toFixed(2) : '0';
    
    // Institutional Data
    const f_sum = parseFloat(context.institutional.foreign_sum || 0);
    const t_sum = parseFloat(context.institutional.trust_sum || 0);
    const inst_total = f_sum + t_sum;

    const changeVal = parseFloat(context.priceData.change_amount || 0);
    const changePer = parseFloat(context.priceData.change_percent || 0);
    const changeTxt = changeVal >= 0 ? `上漲 ${changeVal}` : `下跌 ${Math.abs(changeVal)}`;

    // 2. Sections Generation with Varied Phrasing
    
    // Summary
    let summaryText = `【市場動態】${context.name} (${symbol}) 最新收盤價報 ${close} 元，${changeTxt} 點 (${changePer >= 0 ? '+' : ''}${changePer.toFixed(2)}%)。`;
    summaryText += `今日成交量約 ${volK} 張，整體${vol > 50000 ? '換手積極，多空於此價位交戰激烈' : '交投相對平穩'}。`;
    summaryText += `股價目前處於${is_rebound ? '均線上方支撐位，短線維持強勢' : '月線下方整理，需觀察低檔支撐力道'}。`;

    // Technical
    let trendDesc = ma_bullish ? "呈現標準多頭排列，短中長期趨勢同步向上。" : (close > ma60 ? "中期趨勢仍屬震盪偏多，主要考驗短線乖離率之修正。" : "目前處於中長期整理區間，空方勢頭尚未完全止穩。");
    let techText = `趨勢評估: ${trendDesc} 短期關鍵價位落於 MA5 (${ma5.toFixed(1)})。`;
    techText += `\n動能指標: RSI14 目前讀數為 ${rsi.toFixed(1)}，${rsi > 70 ? '已進入超買警示區，需慎防高檔獲利了結壓力。' : (rsi < 30 ? '進入低檔超賣區，具備短線技術性反彈動能。' : '表現穩健，尚未出現偏執訊號。')}`;
    techText += ` MACD 柱狀體(${macd_hist.toFixed(2)})顯示${macd_hist >= 0 ? '多頭動能強勁。' : '空方力道略有收斂。'}`;
    techText += `\n型態判讀: ${context.priceData.patterns && context.priceData.patterns.length > 0 ? '近期觀察到 ' + context.priceData.patterns.join('、') + ' 等型態。' : 'K線型態呈現整理態勢，市場正等待明確的突破方向。'}`;

    // Fundamental
    let fundText = `獲利能力: ${context.revenue.revenue_month ? context.revenue.revenue_month + ' 月' : '最新'}營收 YoY 為 ${yoy}%，實質獲利成長${parseFloat(yoy) > 20 ? '表現亮眼，優於市場預期' : '符合季節性規律'}。`;
    fundText += `\n評價水平: 目前本益比為 ${pe || 'N/A'} 倍，${pe > 20 ? '在產業鏈中估值相對較高，這隱含了市場對其未來高度成長的共識預期。' : '處於相對合理區間。'}`;
    fundText += ` 殖利率約 ${yield_val}%，適合${yield_val > 4 ? '價值投資者長期持有。' : '尋求資本利得的成長型標的。'}`;

    // Institutional
    let chipText = `籌碼動向: 三大法人近期${inst_total > 0 ? '偏多操作' : (inst_total < 0 ? '偏空調節' : '持股穩定')}。`;
    chipText += ` 其中外資持股${f_sum >= 0 ? '穩中有升' : '略有減碼'}，顯示大戶對後市看法${f_sum >= 0 ? '趨於積極' : '轉向保守'}。`;
    chipText += ` 目前內資投信${t_sum > 0 ? '扮演護盤關鍵角色。' : '動向相對不明朗。'}`;

    // News
    const nowDate = getTaiwanDate();
    const twoDaysAgo = new Date(nowDate.getTime() - (2 * 24 * 60 * 60 * 1000));
    const recentNews = context.news.filter(n => new Date(n.publish_at) >= twoDaysAgo);
    let newsSection = recentNews.length > 0 ? recentNews.slice(0, 3).map(n => `- ${n.title}`).join('\n') : "近期消息面較為平靜，主要受大盤整體情緒影響。";

    // 3. Scoring (Enhanced - 25/25/25/25 weights)
    let techScore = ma_bullish ? 22 : (is_rebound ? 15 : 8);
    let fundScore = parseFloat(yoy) > 15 ? 22 : 12;
    let chipScore = inst_total > 0 ? 22 : 12;
    // 新聞面：根據情緒強度和數量動態計算 (0~25)
    let newsScoreVal = 12; // 基準
    if (context.newsSentiment && context.newsSentiment.count > 0) {
        const sentAvg = context.newsSentiment.avgScore; // -1~1
        newsScoreVal = Math.round(12.5 + sentAvg * 12.5); // 0~25
    } else if (recentNews.length > 0) {
        newsScoreVal = 15;
    }
    const totalScore = techScore + fundScore + chipScore + newsScoreVal;

    const latestDataDate = context.priceData.trade_date ? new Date(context.priceData.trade_date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '未知';

    const sentimentText = context.newsSentiment && context.newsSentiment.count > 0 
        ? `新聞情緒 (近 3 天, 時效加權): ${context.newsSentiment.sentimentLabel} (利多: ${context.newsSentiment.bullishCount} 則, 利空: ${context.newsSentiment.bearishCount} 則, 加權分數: ${context.newsSentiment.avgScore})
關鍵摘要: ${context.newsSentiment.description}`
        : "新聞情緒: 近期無顯著新聞情緒數據";

    // 將新聞按時效分組，強調最新消息
    const now = getTaiwanDate();
    const newsFormatted = formatNewsWithRecency(context.news, now);

    const enrichedData = buildEnrichedDataSection(context);

    const finalPrompt = `
你是一位專業的台灣股票投資分析師。請根據以下完整的個股數據與新聞情感分析，按照【報表模板】格式，生成一份深度投資分析報告。

⚠️ 重要指示：
1. 所有數據已完整提供，請直接引用數據分析，不要說「資料未提供」或「資料缺失」
2. 近24小時內的新聞對明日股價影響最大，請在評分和分析中給予顯著權重
3. 請根據近期價格走勢判斷趨勢方向，不要只看單日數據
4. 操盤建議需給出具體價格區間（進場/目標/停損）

${enrichedData}

【新聞情緒分析】
${sentimentText}

${newsFormatted}

【報表模板】:
${promptTemplate}

請務必將「新聞情緒分析」中提到的關鍵點整合進報告的「核心趨勢」與「綜合建議」中。移除「報告生成日」標籤，直接從標題開始。
`;
    return finalPrompt;
}

/**
 * Generate report using Ollama
 */
async function generateOllamaReport(symbol, context, promptTemplate, modelOverride = null) {
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const modelName = (modelOverride && modelOverride !== 'none') ? modelOverride : (process.env.OLLAMA_MODEL || "qwen3.5:9b");

    const sentimentText = context.newsSentiment && context.newsSentiment.count > 0 
        ? `新聞情緒 (近 3 天, 時效加權): ${context.newsSentiment.sentimentLabel} (利多: ${context.newsSentiment.bullishCount} 則, 利空: ${context.newsSentiment.bearishCount} 則, 加權分數: ${context.newsSentiment.avgScore})`
        : "新聞情緒: 近期無顯著新聞情緒數據";

    const now = getTaiwanDate();
    const newsFormatted = formatNewsWithRecency(context.news, now);
    const enrichedData = buildEnrichedDataSection(context);

    const finalPrompt = `
你是一位專業的台灣股票投資分析師。請根據以下完整的個股數據與新聞情感分析，按照【報表模板】格式，生成一份深度投資分析報告。

⚠️ 重要指示：
1. **禁止輸出任何開場白、思考過程、分析筆記或對指令的重複。**
2. **直接從報表的第一個章節開始輸出，不要有任何前導文字。**
3. 所有數據已完整提供，請直接引用數據分析，不要說「資料未提供」或「資料缺失」。
4. 近24小時內的新聞對明日股價影響最大，請在評分和分析中給予顯著權重。
5. 請根據近期價格走勢判斷趨勢方向，不要只看單日數據。
6. 操盤建議需給出具體價格區間（進場/目標/停損）。

${enrichedData}

【新聞情緒分析】
${sentimentText}

${newsFormatted}

【報表模板】:
${promptTemplate}

請嚴格按照模板結構填寫內容。直接從標題開始。
`;

    try {
        logger.info(`[AI Service] Ollama Start: ${symbol} using ${modelName}...`);
        const startTime = Date.now();
        
        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                prompt: finalPrompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 3072,
                    num_ctx: 8192
                }
            }),
            signal: AbortSignal.timeout(600000) // Increase to 10 minutes for large models
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.info(`[AI Service] Ollama Finished: ${symbol} in ${duration}s`);
        
        return data.response;
    } catch (err) {
        if (err.name === 'TimeoutError') {
            logger.error(`[AI Service] Ollama Timeout for ${symbol} after 10 minutes.`);
        } else {
            logger.error(`[AI Service] Ollama Generation error for ${symbol}: ${err.message}`);
        }
        throw err;
    }
}

// Prompt template 記憶體快取 (避免每次查 DB)
let _templateCache = {};
let _templateCacheTime = 0;
const TEMPLATE_CACHE_TTL = 10 * 60 * 1000; // 10 分鐘

async function getPromptTemplate(templateName, defaultTemplate) {
    const now = Date.now();
    if (_templateCache[templateName] && (now - _templateCacheTime) < TEMPLATE_CACHE_TTL) {
        return _templateCache[templateName];
    }
    const templateRes = await query(
        `SELECT content FROM ai_prompt_templates WHERE name = $1 AND is_active = true LIMIT 1`,
        [templateName]
    );
    const template = templateRes.rows.length > 0 ? templateRes.rows[0].content : defaultTemplate;
    _templateCache[templateName] = template;
    _templateCacheTime = now;
    return template;
}

/**
 * Generate AI report using the active template and gathered data
 */
async function generateAIReport(symbol, modelOverride = null, templateName = 'stock_analysis_report') {
    const DEFAULT_TEMPLATE = `
#### 📝 核心趨勢總結
{0}

#### 📊 技術指標分析
{1}

#### 🧪 基本面深度分析
{2}

#### 🤝 籌碼面法人動向
{3}

#### 📰 相關重要訊息
{4}

#### 💡 綜合結論與投資策略
- **綜合評分: {5} / 100**
- **短線觀點**: {6}
- **操作建議**: {7}
- **風險提醒**: {8}
`;

    try {
        const context = await gatherStockContext(symbol);

        let promptTemplate = await getPromptTemplate(templateName, DEFAULT_TEMPLATE);

        const geminiInfo = await getGenAIInstanceAsync();
        const hasOllama = process.env.OLLAMA_URL && process.env.OLLAMA_URL.length > 5;
        
        let finalContent = "";
        let sentimentScore = 50;
        let generationMode = "none";
        let usedModelName = "none";

        if (geminiInfo) {
            // Priority 1: Gemini
            generationMode = "gemini";
            const { instance: genAI, keyHint } = geminiInfo;
            logger.info(`[AI Service] Using Gemini Key: ${keyHint}`);
            const sentimentText = context.newsSentiment && context.newsSentiment.count > 0 
                ? `新聞情緒 (近 3 天, 時效加權): ${context.newsSentiment.sentimentLabel} (利多: ${context.newsSentiment.bullishCount} 則, 利空: ${context.newsSentiment.bearishCount} 則, 加權分數: ${context.newsSentiment.avgScore})`
                : "新聞情緒: 近期無顯著新聞情緒數據";

            const now = getTaiwanDate();
            const newsFormatted = formatNewsWithRecency(context.news, now);
            const enrichedData = buildEnrichedDataSection(context);

            const finalPrompt = `
你是一位專業的台灣股票投資分析師。請根據以下完整的個股數據與新聞情感分析，按照【報表模板】格式，生成一份深度投資分析報告。

⚠️ 重要指示：
1. **絕對禁止輸出任何開場白、思考過程、內心獨白或對指令的分析過程。**
2. **直接從報表的第一個章節標題開始，例如 "#### 📝 核心趨勢總結"。**
3. 所有數據已完整提供，請直接引用數據分析，不要說「資料未提供」或「資料缺失」。
4. 近24小時內的新聞對明日股價影響最大，請在評分和分析中給予顯著權重。
5. 操盤建議需給出具體價格區間（進場/目標/停損）。

${enrichedData}

【新聞情緒分析】
${sentimentText}

${newsFormatted}

【報表模板】:
${promptTemplate}

請務必將「新聞情緒分析」中提到的關鍵點整合進報告中。直接從報表標題開始。
`;
            // 支援 403 / 429 等自動換金鑰重試
            const maxRetries = genAIPool.length || 3;
            for (let retry = 0; retry < maxRetries; retry++) {
                const { instance: retryGenAI, keyHint: retryHint, keyIndex, dbId } = await getGenAIInstanceAsync();
                const callStart = Date.now();
                try {
                    const modelName = "models/gemma-4-31b-it";
                    const model = retryGenAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(finalPrompt);
                    
                    // 使用 SDK 原生解析：取得最終產出 (text)，直接忽略思考過程 (thought)
                    let actualContent = '';
                    const parts = result.response?.candidates?.[0]?.content?.parts || [];
                    
                    for (const part of parts) {
                        if (part.text && !part.thought) {
                            actualContent += part.text;
                        }
                    }
                    
                    if (!actualContent && result.response.text) {
                        actualContent = result.response.text();
                    }
                    
                    const latency = Date.now() - callStart;
                    updateKeyMetrics(dbId, true, false, latency);
                    
                    finalContent = actualContent.trim();
                    gemmaSuccess = true;
                    break;
                } catch (keyErr) {
                    const latency = Date.now() - callStart;
                    const errDetail = keyErr.message || String(keyErr);
                    const is429 = errDetail.includes('429') || errDetail.includes('quota') || errDetail.includes('exceeded');
                    
                    updateKeyMetrics(dbId, false, is429, latency);
                    
                    if (errDetail.includes('403') || errDetail.includes('400') || is429 || errDetail.includes('API_KEY_INVALID') || errDetail.includes('denied access')) {
                        markKeyBlocked(keyIndex);
                        logger.error(`[AI Service] Key ${retryHint} blocked due to error: ${errDetail}`);
                        continue;
                    }
                    logger.error(`[AI Service] Key ${retryHint} unexpected error: ${errDetail}`);
                    throw keyErr; // 其他錯誤直接拋出
                }
            }
            if (!gemmaSuccess) {
                logger.warn('[AI Service] 所有 Gemini API 金鑰均無法存取或已超限，自動降級至 Ollama 或 Smart Engine...');
            }
        }

        // 如果沒有啟用 Gemini 或是 Gemini 呼叫全部失敗，則降級至 Ollama 或 Smart Engine
        if (!gemmaSuccess) {
            if (hasOllama) {
                // Priority 2: Local Ollama
                generationMode = "ollama";
                const targetModel = (modelOverride && modelOverride !== 'none') ? modelOverride : (process.env.OLLAMA_MODEL || "qwen3.5:9b");
                logger.info(`[AI Service] Using Local Ollama (${targetModel}) for ${symbol}`);
                finalContent = await generateOllamaReport(symbol, context, promptTemplate, targetModel);
            } else {
                // Priority 3: Smart Engine (Rule-based)
                generationMode = "smart_engine";
                logger.info(`[AI Service] Using Smart Engine for ${symbol}`);
                finalContent = generateSmartEngineReport(symbol, context, promptTemplate);
            }
        }

        // --- 後處理：移除 AI 可能輸出的思考過程、開場白等垃圾資訊 ---
        // 尋找第一個 "#" (Markdown 標題)，這通常是報表模板的開始
        const firstHeaderIndex = finalContent.indexOf('#');
        if (firstHeaderIndex > 0) {
            // 檢查前綴是否包含 "thought" 標籤或長篇思考文字
            const preamble = finalContent.substring(0, firstHeaderIndex);
            if (preamble.includes('thought') || preamble.includes('Thinking') || preamble.length > 30) {
                logger.info(`[AI Service] Stripping Preamble from ${symbol} report (${preamble.length} chars)`);
                finalContent = finalContent.substring(firstHeaderIndex);
            }
        }
        // 移除 <thought> 標籤 (如果有的話)
        finalContent = finalContent.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
        // -------------------------------------------------------

        // 納入新聞情緒加權評分 (對最終評分進行修正，情緒佔比 40%)
        let scoreVal = 50;
        const scoreMatch = finalContent.match(/評分[^\d]*(\d+)/) || 
                          finalContent.match(/Score[^\d]*(\d+)/) || 
                          finalContent.match(/\*\*(\d+)\s*\/\s*100\*\*/);
        if (scoreMatch) scoreVal = parseInt(scoreMatch[1]);

        if (context.newsSentiment && context.newsSentiment.count > 0) {
            const rawAiScore = scoreVal;
            const newsScore = (context.newsSentiment.avgScore + 1) * 50; // -1~1 轉為 0~100
            // 動態權重：新聞越多/情緒越極端 → 權重越高 (10%~30%)
            const sentimentIntensity = Math.abs(context.newsSentiment.avgScore); // 0~1
            const newsWeight = Math.min(0.30, 0.10 + sentimentIntensity * 0.15 + Math.min(context.newsSentiment.count, 10) * 0.005);
            scoreVal = Math.round(rawAiScore * (1 - newsWeight) + newsScore * newsWeight);
            logger.info(`[AI Service] Score Weighted: ${rawAiScore} (AI) * ${(1 - newsWeight).toFixed(2)} + ${newsScore.toFixed(0)} (News) * ${newsWeight.toFixed(2)} = ${scoreVal}`);
        }

        // --- IMPORTANT: Refactored: Removed direct DB saving here. ---
        // Let the caller (worker) handle saving to ensure transactional integrity.
        
        // Final sanity check: if content is too short, LLM likely failed or gave garbage
        if (!finalContent || finalContent.trim().length < 100) {
            throw new Error(`AI generated content too short (${finalContent ? finalContent.trim().length : 0} chars). Model may have glitched.`);
        }

        return {
            success: true,
            symbol,
            content: finalContent,
            sentimentScore: scoreVal,
            generationMode,
            modelName: generationMode === 'gemini' ? 'models/gemma-4-31b-it' : ((modelOverride && modelOverride !== 'none') ? modelOverride : (process.env.OLLAMA_MODEL || "qwen3.5:9b"))
        };
    } catch (err) {
        logger.error(`AI/Engine Report Generation Error: ${err.message}`);
        return { success: false, error: err.message, generationMode: "error", modelName: "none" };
    }
}

module.exports = { generateAIReport, generateSmartEngineReport, gatherStockContext, generateOllamaReport, buildEnrichedDataSection };
