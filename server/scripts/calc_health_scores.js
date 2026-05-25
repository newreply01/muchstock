/**
 * Batch Health Check Scoring Script
 * 
 * Pre-calculates health check scores for ALL stocks and stores them
 * in the stock_health_scores table for fast API retrieval.
 * 
 * Can be run standalone or triggered after daily data sync.
 */

const { query } = require('../db');

/**
 * Compute percentile-based scores (0-100) for a list of stock metrics.
 * Handles ties by assigning average rank. Missing data → neutral 50.
 * @param {Array<{symbol, value, hasData}>} entries
 * @param {boolean} higherIsBetter - true: higher value = higher score
 */
function calcPercentileScores(entries, higherIsBetter = true) {
    const withData = entries.filter(e => e.hasData && !isNaN(e.value) && isFinite(e.value));
    const result = {};

    if (withData.length === 0) {
        entries.forEach(e => { result[e.symbol] = 50; });
        return result;
    }

    // Sort: ascending for higherIsBetter (low value = low rank), descending otherwise
    withData.sort((a, b) => higherIsBetter ? a.value - b.value : b.value - a.value);
    const n = withData.length;

    // Handle ties: assign average percentile to tied values
    let i = 0;
    while (i < n) {
        let j = i;
        while (j < n && withData[j].value === withData[i].value) j++;
        const avgRank = (i + j - 1) / 2;
        const pct = Math.round((avgRank / Math.max(n - 1, 1)) * 100);
        for (let k = i; k < j; k++) {
            result[withData[k].symbol] = pct;
        }
        i = j;
    }

    // Missing data → neutral 50
    entries.forEach(e => {
        if (result[e.symbol] === undefined) result[e.symbol] = 50;
    });

    return result;
}

async function createTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS stock_health_scores (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL,
            name VARCHAR(100),
            industry VARCHAR(100),
            market VARCHAR(10),
            close_price DECIMAL(12,2),
            change_percent DECIMAL(8,4),
            overall_score INTEGER DEFAULT 0,
            grade VARCHAR(20),
            grade_color VARCHAR(20),
            profit_score INTEGER DEFAULT 0,
            growth_score INTEGER DEFAULT 0,
            safety_score INTEGER DEFAULT 0,
            value_score INTEGER DEFAULT 0,
            dividend_score INTEGER DEFAULT 0,
            chip_score INTEGER DEFAULT 0,
            pe DECIMAL(10,2),
            pb DECIMAL(10,2),
            dividend_yield DECIMAL(8,4),
            roe DECIMAL(8,2),
            gross_margin DECIMAL(8,2),
            revenue_growth DECIMAL(10,2),
            eps_growth DECIMAL(10,2),
            avg_cash_dividend DECIMAL(8,2),
            inst_net_buy DECIMAL(12,2),
            news_score INTEGER DEFAULT 0,
            smart_score DECIMAL(5,2),
            smart_rating VARCHAR(20),
            calc_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(symbol, calc_date)
        );
        CREATE INDEX IF NOT EXISTS idx_health_scores_date ON stock_health_scores(calc_date);
        CREATE INDEX IF NOT EXISTS idx_health_scores_overall ON stock_health_scores(overall_score DESC);
        CREATE INDEX IF NOT EXISTS idx_health_scores_symbol ON stock_health_scores(symbol);
    `);
    console.log('✅ stock_health_scores table ready');
}

async function calcAllScores() {
    console.time('⏱️ Total batch health check');

    // Get all active stocks
    const stocksRes = await query(`
        SELECT s.symbol, s.name, s.industry, s.market
        FROM stocks s
        WHERE s.symbol ~ '^[0-9]{4}$'
        ORDER BY s.symbol
    `);
    const allStocks = stocksRes.rows;
    console.log(`📊 Processing ${allStocks.length} stocks...`);

    // Get latest trade date - only use dates where ≥500 individual stocks have data
    const dateRes = await query(`
        SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as latest
        FROM daily_prices
        WHERE symbol ~ '^[0-9]{4}$'
        GROUP BY trade_date
        HAVING COUNT(DISTINCT symbol) >= 500
        ORDER BY trade_date DESC
        LIMIT 1
    `);
    let calcDate = dateRes.rows[0]?.latest;
    
    if (!calcDate) {
        calcDate = new Date().toISOString().split('T')[0];
    }
    console.log(`📅 Using calcDate: ${calcDate}`);

    // Batch fetch: fundamentals for all stocks
    const fundRes = await query(`
        SELECT DISTINCT ON (symbol) symbol, pe_ratio, pb_ratio, dividend_yield
        FROM fundamentals
        ORDER BY symbol, trade_date DESC
    `);
    const fundMap = {};
    fundRes.rows.forEach(r => { fundMap[r.symbol] = r; });

    // Batch fetch: prices for the calcDate (not just global latest)
    const priceRes = await query(`
        SELECT DISTINCT ON (symbol) symbol, close_price, change_percent
        FROM daily_prices
        WHERE trade_date <= $1::date
        ORDER BY symbol, trade_date DESC
    `, [calcDate]);
    const priceMap = {};
    priceRes.rows.forEach(r => { priceMap[r.symbol] = r; });

    // Batch fetch: monthly revenue (latest 13 months per stock) - FILTER IN SQL
    const revRes = await query(`
        SELECT symbol, revenue, revenue_year, revenue_month
        FROM (
            SELECT symbol, revenue, revenue_year, revenue_month,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY revenue_year DESC, revenue_month DESC) as rn
            FROM monthly_revenue
        ) t
        WHERE rn <= 13
    `);
    const revMap = {};
    revRes.rows.forEach(r => {
        if (!revMap[r.symbol]) revMap[r.symbol] = [];
        revMap[r.symbol].push(r);
    });

    // Batch fetch: EPS (latest 8 per stock) - FILTER IN SQL
    const epsRes = await query(`
        SELECT symbol, value, date
        FROM (
            SELECT symbol, value, date,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
            FROM financial_statements
            WHERE type = 'EPS'
        ) t
        WHERE rn <= 8
    `);
    const epsMap = {};
    epsRes.rows.forEach(r => {
        if (!epsMap[r.symbol]) epsMap[r.symbol] = [];
        epsMap[r.symbol].push(r);
    });

    // Batch fetch: institutional (latest 10 per stock) - FILTER IN SQL
    const instRes = await query(`
        SELECT symbol, foreign_net, trust_net, total_net
        FROM (
            SELECT symbol, foreign_net, trust_net, total_net,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_date DESC) as rn
            FROM institutional
        ) t
        WHERE rn <= 10
    `);
    const instMap = {};
    instRes.rows.forEach(r => {
        if (!instMap[r.symbol]) instMap[r.symbol] = [];
        instMap[r.symbol].push(r);
    });

    // Batch fetch: dividends (latest 5 per stock) - FILTER IN SQL
    const divRes = await query(`
        SELECT symbol, year, cash_dividend
        FROM (
            SELECT symbol, year, cash_dividend,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY year DESC) as rn
            FROM dividend_policy
        ) t
        WHERE rn <= 5
    `);
    const divMap = {};
    divRes.rows.forEach(r => {
        if (!divMap[r.symbol]) divMap[r.symbol] = [];
        divMap[r.symbol].push(r);
    });

    // Batch fetch: GrossProfit & Revenue from fm_financial_statements
    const grossRes = await query(`
        SELECT stock_id, value,
               ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY date DESC) as rn
        FROM fm_financial_statements
        WHERE type = 'GrossProfit'
    `);
    const grossMap = {};
    grossRes.rows.forEach(r => {
        if (r.rn == 1) grossMap[r.stock_id] = parseFloat(r.value) || 0;
    });

    const revStatRes = await query(`
        SELECT stock_id, value,
               ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY date DESC) as rn
        FROM fm_financial_statements
        WHERE type = 'Revenue'
    `);
    const revStatMap = {};
    revStatRes.rows.forEach(r => {
        if (r.rn == 1) revStatMap[r.stock_id] = parseFloat(r.value) || 0;
    });

    // Batch fetch: Debt/Equity ratio (latest Liabilities / Equity)
    const debtRes = await query(`
        SELECT f1.stock_id, 
               ROUND((f1.value::numeric / NULLIF(f2.value::numeric, 0) * 100), 1) as de_ratio
        FROM (SELECT DISTINCT ON (stock_id) stock_id, value FROM fm_financial_statements WHERE type='Liabilities' ORDER BY stock_id, date DESC) f1
        JOIN (SELECT DISTINCT ON (stock_id) stock_id, value FROM fm_financial_statements WHERE type='Equity' AND value::numeric > 0 ORDER BY stock_id, date DESC) f2 ON f1.stock_id = f2.stock_id
    `);
    const debtMap = {};
    debtRes.rows.forEach(r => { debtMap[r.stock_id] = parseFloat(r.de_ratio) || 0; });
    console.log(`📊 D/E ratio data for ${Object.keys(debtMap).length} stocks`);

    // Batch fetch: Outstanding shares (OrdinaryShare) for chip normalization
    const sharesRes = await query(`
        SELECT DISTINCT ON (stock_id) stock_id, value
        FROM fm_financial_statements
        WHERE type = 'OrdinaryShare' AND value::numeric > 0
        ORDER BY stock_id, date DESC
    `);
    const sharesMap = {};
    sharesRes.rows.forEach(r => { sharesMap[r.stock_id] = parseFloat(r.value) || 0; });
    console.log(`📊 Outstanding shares data for ${Object.keys(sharesMap).length} stocks`);

    // Batch fetch: Latest technical indicators
    const indicatorRes = await query(`
        SELECT DISTINCT ON (symbol) symbol, rsi_14, macd_value, macd_signal, macd_hist, ma_5, ma_20, ma_60,
               k_value, d_value, upper_band, lower_band, ibs, volume_ratio
        FROM indicators
        ORDER BY symbol, trade_date DESC
    `);
    const indicatorMap = {};
    indicatorRes.rows.forEach(r => { indicatorMap[r.symbol] = r; });

    // Batch fetch: 20-day high/low for all stocks
    const srRes = await query(`
        SELECT symbol, MAX(high_price) as high_20, MIN(low_price) as low_20
        FROM (
            SELECT symbol, high_price, low_price,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_date DESC) as rn
            FROM daily_prices
        ) t
        WHERE rn <= 20
        GROUP BY symbol
    `);
    const srMap = {};
    srRes.rows.forEach(r => { srMap[r.symbol] = r; });

    // Batch fetch: Latest AI Sentiment Scores
    const aiRes = await query(`
        SELECT DISTINCT ON (symbol) symbol, sentiment_score
        FROM ai_reports
        ORDER BY symbol, created_at DESC
    `);
    const aiMap = {};
    aiRes.rows.forEach(r => { aiMap[r.symbol] = parseFloat(r.sentiment_score); });

    // Batch fetch: News Sentiment (time-weighted, last 14 days)
    const newsSentRes = await query(`
        SELECT s.symbol,
               COUNT(*) as news_count,
               SUM(
                   CASE
                       WHEN n.publish_at >= NOW() - INTERVAL '3 days' THEN s.score::numeric * 1.0
                       WHEN n.publish_at >= NOW() - INTERVAL '7 days' THEN s.score::numeric * 0.6
                       ELSE s.score::numeric * 0.3
                   END
               ) as weighted_score_sum,
               SUM(
                   CASE
                       WHEN n.publish_at >= NOW() - INTERVAL '3 days' THEN 1.0
                       WHEN n.publish_at >= NOW() - INTERVAL '7 days' THEN 0.6
                       ELSE 0.3
                   END
               ) as weight_sum
        FROM news_stock_sentiment s
        JOIN news n ON s.news_id::integer = n.news_id
        WHERE n.publish_at >= NOW() - INTERVAL '14 days'
        GROUP BY s.symbol
    `);
    const newsSentMap = {};
    newsSentRes.rows.forEach(r => {
        const weightSum = parseFloat(r.weight_sum) || 1;
        const avgScore = parseFloat(r.weighted_score_sum) / weightSum; // -1 ~ 1
        newsSentMap[r.symbol] = { avgScore, count: parseInt(r.news_count) };
    });
    console.log(`📰 News sentiment data for ${Object.keys(newsSentMap).length} stocks`);

    // ===== Pass 1: Compute raw metrics for all stocks =====
    const rawData = [];
    let skipped = 0;
    const processedSymbols = new Set();

    for (const stock of allStocks) {
        const sym = stock.symbol;
        if (processedSymbols.has(sym)) continue;
        processedSymbols.add(sym);

        const fund = fundMap[sym] || {};
        const price = priceMap[sym] || {};
        const pe = parseFloat(fund.pe_ratio) || 0;
        const pb = parseFloat(fund.pb_ratio) || 0;
        const dy = parseFloat(fund.dividend_yield) || 0;
        const closePrice = parseFloat(price.close_price) || 0;
        const changePct = parseFloat(price.change_percent) || 0;

        if (!closePrice) { skipped++; continue; }

        const gp = grossMap[sym] || 0;
        const rv = revStatMap[sym] || 0;
        const grossMargin = (rv > 0 && gp > 0) ? (gp / rv * 100) : 0;
        const roe = (pe > 0 && pb > 0) ? (pb / pe * 100) : 0;

        const revRows = revMap[sym] || [];
        let revenueGrowth = 0;
        let hasRevenueData = false;
        if (revRows.length >= 13) {
            const curr = parseFloat(revRows[0].revenue);
            const prev = parseFloat(revRows[12].revenue);
            if (prev > 0) { revenueGrowth = ((curr - prev) / prev) * 100; hasRevenueData = true; }
        }

        const divRows = divMap[sym] || [];
        const avgCashDiv = divRows.length > 0
            ? divRows.reduce((s, d) => s + parseFloat(d.cash_dividend || 0), 0) / divRows.length
            : 0;

        const instRows = instMap[sym] || [];
        const totalBuy = instRows.reduce((s, r) => s + parseFloat(r.total_net || 0), 0);

        // Outstanding shares for chip normalization (convert from unit to thousands of shares)
        const outstandingShares = sharesMap[sym] || 0;

        // D/E ratio for safety
        const deRatio = debtMap[sym] || 0;

        // EPS stability: count of positive EPS quarters (out of recent 8)
        const epsRows = epsMap[sym] || [];
        let epsGrowth = 0;
        let hasEpsData = false;
        if (epsRows.length >= 5) {
            const curr = parseFloat(epsRows[0].value);
            const prev = parseFloat(epsRows[4].value);
            if (prev > 0) { epsGrowth = ((curr - prev) / prev) * 100; hasEpsData = true; }
        }
        const recentEps = epsRows.slice(0, 8);
        const epsPositiveRate = recentEps.length >= 4
            ? recentEps.filter(e => parseFloat(e.value) > 0).length / recentEps.length
            : 0.5; // neutral if insufficient data
            
        const isLoss = epsRows.length > 0 && parseFloat(epsRows[0].value) < 0;

        rawData.push({
            sym, name: stock.name, industry: stock.industry, market: stock.market,
            pe, pb, dy, closePrice, changePct,
            roe, grossMargin,
            revenueGrowth, hasRevenueData,
            epsGrowth, hasEpsData,
            avgCashDiv, totalBuy, outstandingShares,
            deRatio, epsPositiveRate,
            hasPe: pe > 0,
            hasPb: pb > 0,
            hasRoe: roe > 0,
            hasGrossMargin: grossMargin > 0,
            hasCashDiv: divRows.length > 0,
            hasInst: instRows.length > 0,
            hasDeRatio: deRatio > 0,
            hasEpsStability: recentEps.length >= 4,
            hasShares: outstandingShares > 0,
            isLoss: isLoss,
        });
    }

    console.log(`📊 Raw metrics for ${rawData.length} stocks (skipped ${skipped} without price)`);

    // ===== Pass 2: Percentile-based scoring per dimension =====
    // Profit: ROE↑ + Gross Margin↑
    const roeScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.roe, hasData: r.hasRoe })), true);
    const gmScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.grossMargin, hasData: r.hasGrossMargin })), true);

    // Growth: Revenue Growth↑ + EPS Growth↑
    const revGrowthScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.revenueGrowth, hasData: r.hasRevenueData })), true);
    const epsGrowthScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.epsGrowth, hasData: r.hasEpsData })), true);

    // Safety: Low D/E ratio↓ (50%) + EPS stability↑ (50%) — decoupled from value
    const deScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.deRatio, hasData: r.hasDeRatio })), false);
    const epsStabilityScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.epsPositiveRate, hasData: r.hasEpsStability })), true);

    // Value: PE↓ (lower PE = cheaper, only positive PE stocks participate)
    const peScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.pe, hasData: r.hasPe })), false);
    
    // Fix missing PE scores (calcPercentileScores assigns 50 by default to missing data)
    rawData.forEach(r => {
        if (!r.hasPe) {
            peScores[r.sym] = r.isLoss ? 10 : 30; // 10 for loss-making, 30 for missing data
        }
    });

    // Dividend: DY↑ + Avg Cash Dividend↑
    const dyScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.dy, hasData: true })), true);
    const cashDivScores = calcPercentileScores(rawData.map(r => ({ symbol: r.sym, value: r.avgCashDiv, hasData: r.hasCashDiv })), true);

    // Chip: Institutional net buy as % of outstanding shares ↑ (normalized)
    const chipNormalized = rawData.map(r => {
        if (r.hasInst && r.hasShares && r.outstandingShares > 0) {
            return { symbol: r.sym, value: r.totalBuy / r.outstandingShares * 100, hasData: true };
        }
        return { symbol: r.sym, value: r.totalBuy, hasData: r.hasInst };
    });
    const chipRawScores = calcPercentileScores(chipNormalized, true);

    // ===== Pass 3: Assign final scores, grades, smart ratings =====
    let processed = 0;
    const batchValues = [];

    for (const raw of rawData) {
        const sym = raw.sym;

        const profitScore = Math.round((roeScores[sym] + gmScores[sym]) / 2);
        const growthScore = Math.round((revGrowthScores[sym] + epsGrowthScores[sym]) / 2);
        const safetyScore = Math.round((deScores[sym] + epsStabilityScores[sym]) / 2);
        const valueScore = peScores[sym];
        const dividendScore = Math.round((dyScores[sym] + cashDivScores[sym]) / 2);
        const chipScore = chipRawScores[sym];

        // News Score: Convert -1~1 weighted sentiment → 0~100
        // Stocks without news data get neutral 50
        const newsSent = newsSentMap[sym];
        let newsScore = 50; // neutral default
        if (newsSent) {
            // avgScore is -1~1, convert to 0~100
            // Apply confidence scaling: more news = more confident, less regression to mean
            const confidence = Math.min(1, newsSent.count / 5); // 5+ articles = full confidence
            const rawNewsScore = (newsSent.avgScore + 1) * 50; // 0~100
            newsScore = Math.round(rawNewsScore * confidence + 50 * (1 - confidence));
        }

        // Weighted overall: Profit 20% + Growth 15% + Value 15% + Chip 13% + Safety 7% + Dividend 10% + News 20%
        const overall = Math.round(
            profitScore * 0.20 + growthScore * 0.15 + valueScore * 0.15 +
            chipScore * 0.13 + safetyScore * 0.07 + dividendScore * 0.10 +
            newsScore * 0.20
        );

        let grade = '普通', gradeColor = 'yellow';
        if (overall >= 65) { grade = '優秀'; gradeColor = 'green'; }
        else if (overall >= 50) { grade = '良好'; gradeColor = 'blue'; }
        else if (overall >= 35) { grade = '普通'; gradeColor = 'yellow'; }
        else { grade = '待改善'; gradeColor = 'red'; }

        // --- Smart Rating: 7-level signal-counting system ---
        // Each of 7 dimensions casts one bullish (+1) or bearish (-1) vote.
        // net = bullVotes - bearVotes  →  maps to 7 grades with explicit reasoning.
        const indicators = indicatorMap[sym] || {};
        const ma5 = parseFloat(indicators.ma_5);
        const ma20 = parseFloat(indicators.ma_20);
        const ma60 = parseFloat(indicators.ma_60);
        const rsi = parseFloat(indicators.rsi_14);
        const k = parseFloat(indicators.k_value);
        const d = parseFloat(indicators.d_value);
        const macdHist = parseFloat(indicators.macd_hist);

        let bullVotes = 0, bearVotes = 0;

        // Signal 1: MA排列趨勢 — 均線多頭/空頭排列
        if (!isNaN(ma5) && !isNaN(ma20)) {
            if (raw.closePrice > ma5 && ma5 > ma20) bullVotes++;
            else if (raw.closePrice < ma5 && ma5 < ma20) bearVotes++;
        }
        // Signal 2: RSI動能濾網 — 動能轉強 / 動能偏弱
        if (!isNaN(rsi)) {
            if (rsi >= 55) bullVotes++;        // 強勢動能，偏多
            else if (rsi <= 45) bearVotes++;   // 弱勢動能，偏空
        }
        // Signal 3: KD交叉 — 黃金交叉看多 / 死亡交叉看空
        if (!isNaN(k) && !isNaN(d)) {
            if (k > d) bullVotes++;
            else bearVotes++;
        }
        // Signal 4: MACD柱狀體 — 正值動能增強 / 負值動能減弱
        if (!isNaN(macdHist)) {
            if (macdHist > 0) bullVotes++;
            else bearVotes++;
        }
        // Signal 5: 基本面健康度 — 整體健診分數
        if (overall >= 60) bullVotes++;
        else if (overall < 40) bearVotes++;
        // Signal 6: 籌碼動向 — 法人積極買超 / 法人持續賣超
        if (chipScore >= 65) bullVotes++;
        else if (chipScore < 35) bearVotes++;
        // Signal 7: 消息面情緒 — 近期新聞正向 / 負向
        if (newsScore >= 65) bullVotes++;
        else if (newsScore < 35) bearVotes++;

        const netSignal = bullVotes - bearVotes;

        // compositeScore: normalize netSignal to -1~1 for backwards compatibility & sorting
        const compositeScore = netSignal / 7;

        // 7-level criteria-based rating
        let smartRating;
        if (netSignal >= 5) smartRating = '強力推薦';       // 5~7 signals bullish — all-round strength
        else if (netSignal >= 3) smartRating = '推薦';      // 3~4 signals bullish — predominantly positive
        else if (netSignal >= 1) smartRating = '偏多操作';  // 1~2 signals bullish — slight edge
        else if (netSignal === 0) smartRating = '中立';     // balanced — no clear direction
        else if (netSignal >= -2) smartRating = '偏空觀察'; // -1~-2 bearish edge
        else if (netSignal >= -4) smartRating = '減碼';     // -3~-4 predominantly negative
        else smartRating = '大幅減碼';                       // -5 ~ -7 comprehensive weakness

        batchValues.push([
            sym, raw.name, raw.industry, raw.market,
            raw.closePrice, raw.changePct,
            overall, grade, gradeColor,
            profitScore, growthScore, safetyScore, valueScore, dividendScore, chipScore,
            newsScore,
            raw.pe, raw.pb, raw.dy, raw.roe.toFixed(2), raw.grossMargin.toFixed(2),
            raw.revenueGrowth.toFixed(2), raw.epsGrowth.toFixed(2),
            raw.avgCashDiv.toFixed(2), (raw.totalBuy / 1000).toFixed(2),
            compositeScore.toFixed(2), smartRating,
            calcDate
        ]);
        processed++;
    }

    // Print distribution
    const ratingCounts = {};
    batchValues.forEach(v => { const r = v[26]; ratingCounts[r] = (ratingCounts[r] || 0) + 1; });
    console.log('📊 Smart Rating distribution (signal-based):');
    ['強力推薦','推薦','偏多操作','中立','偏空觀察','減碼','大幅減碼'].forEach(label => {
        const cnt = ratingCounts[label] || 0;
        console.log(`   ${label}: ${cnt} (${(cnt / batchValues.length * 100).toFixed(1)}%)`);
    });

    // Batch insert (upsert)
    console.log(`📝 Inserting ${batchValues.length} scores (skipped ${skipped})...`);

    // Delete old entries for this date first
    await query('DELETE FROM stock_health_scores WHERE calc_date = $1', [calcDate]);

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < batchValues.length; i += BATCH_SIZE) {
        const batch = batchValues.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map((_, idx) => {
            const base = idx * 28;
            return `(${Array.from({ length: 28 }, (_, j) => `$${base + j + 1}`).join(',')})`;
        }).join(',');

        const flatValues = batch.flat();

        try {
            await query(`
                INSERT INTO stock_health_scores
                (symbol, name, industry, market, close_price, change_percent,
                 overall_score, grade, grade_color,
                 profit_score, growth_score, safety_score, value_score, dividend_score, chip_score,
                 news_score,
                 pe, pb, dividend_yield, roe, gross_margin,
                 revenue_growth, eps_growth, avg_cash_dividend, inst_net_buy, 
                 smart_score, smart_rating, calc_date)
                VALUES ${placeholders}
                ON CONFLICT (symbol, calc_date) DO UPDATE SET
                    name = EXCLUDED.name,
                    industry = EXCLUDED.industry,
                    market = EXCLUDED.market,
                    close_price = EXCLUDED.close_price,
                    change_percent = EXCLUDED.change_percent,
                    overall_score = EXCLUDED.overall_score,
                    grade = EXCLUDED.grade,
                    grade_color = EXCLUDED.grade_color,
                    profit_score = EXCLUDED.profit_score,
                    growth_score = EXCLUDED.growth_score,
                    safety_score = EXCLUDED.safety_score,
                    value_score = EXCLUDED.value_score,
                    dividend_score = EXCLUDED.dividend_score,
                    chip_score = EXCLUDED.chip_score,
                    news_score = EXCLUDED.news_score,
                    pe = EXCLUDED.pe,
                    pb = EXCLUDED.pb,
                    dividend_yield = EXCLUDED.dividend_yield,
                    roe = EXCLUDED.roe,
                    gross_margin = EXCLUDED.gross_margin,
                    revenue_growth = EXCLUDED.revenue_growth,
                    eps_growth = EXCLUDED.eps_growth,
                    avg_cash_dividend = EXCLUDED.avg_cash_dividend,
                    inst_net_buy = EXCLUDED.inst_net_buy,
                    smart_score = EXCLUDED.smart_score,
                    smart_rating = EXCLUDED.smart_rating,
                    created_at = NOW()
            `, flatValues);
        } catch (err) {
            console.error(`❌ Error in batch ${i}-${i + BATCH_SIZE}:`, err.message);
            console.log('Symbols in this batch:', batch.map(b => b[0]).join(', '));
            throw err;
        }

        if ((i / BATCH_SIZE) % 5 === 0) {
            console.log(`  ...inserted ${Math.min(i + BATCH_SIZE, batchValues.length)}/${batchValues.length}`);
        }
    }

    console.timeEnd('⏱️ Total batch health check');
    console.log(`✅ Done! ${processed} stocks scored.`);
}

async function runAll() {
    await createTable();
    await calcAllScores();
}

// Run if called directly
if (require.main === module) {
    runAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runAll };
