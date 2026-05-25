const fs = require('fs');
const path = require('path');
const { generateAIReport } = require('../utils/ai_service');
const { pool } = require('../db');
const { formatTaiwanTime } = require('../utils/timeUtils');

async function injectBatchPart(partNum, startIndex, endIndex) {
    console.log(`🚀 Starting injection for Batch 10 Part ${partNum} (Indices ${startIndex}-${endIndex})...`);
    
    const contextPath = path.join(__dirname, 'batch_context_10.json');
    if (!fs.existsSync(contextPath)) {
        console.error(`❌ Error: ${contextPath} not found.`);
        process.exit(1);
    }

    const allContext = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
    const batchData = allContext.slice(startIndex, endIndex);
    console.log(`📊 Processing ${batchData.length} symbols.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < batchData.length; i++) {
        const item = batchData[i];
        if (!item || !item.symbol) continue;
        const symbol = item.symbol;
        
        process.stdout.write(`[⏳] P${partNum} ${symbol} (${i + 1}/${batchData.length})... `);

        try {
            const latestPrice = item.prices && item.prices[0] ? item.prices[0] : {};
            const priceData = {
                trade_date: latestPrice.trade_date,
                close_price: parseFloat(latestPrice.close_price || 0),
                change_amount: parseFloat(latestPrice.change_amount || 0),
                change_percent: parseFloat(latestPrice.change_percent || 0),
                volume: parseFloat(latestPrice.volume || 0),
                ma_5: parseFloat(latestPrice.ma_5 || 0),
                ma_10: parseFloat(latestPrice.ma_10 || 0),
                ma_20: parseFloat(latestPrice.ma_20 || 0),
                ma_60: parseFloat(latestPrice.ma_60 || 0),
                rsi_14: parseFloat(latestPrice.rsi_14 || 50),
                macd_hist: parseFloat(latestPrice.macd_hist || 0),
                upper_band: parseFloat(latestPrice.upper_band || 0),
                lower_band: parseFloat(latestPrice.lower_band || 0),
                patterns: Array.isArray(latestPrice.patterns) ? latestPrice.patterns : []
            };

            const fundamentals = {
                pe_ratio: item.fundamentals.pe_ratio,
                pb_ratio: item.fundamentals.pb_ratio,
                dividend_yield: item.fundamentals.dividend_yield
            };

            const instList = item.institutional || [];
            const institutional = {
                foreign_sum: instList.reduce((sum, row) => sum + parseFloat(row.foreign_net || 0), 0),
                trust_sum: instList.reduce((sum, row) => sum + parseFloat(row.trust_net || 0), 0),
                dealer_sum: instList.reduce((sum, row) => sum + parseFloat(row.dealer_net || 0), 0)
            };

            const revList = item.revenue || [];
            const latestRev = revList[0] || {};
            let prevYearRev = null;
            if (latestRev.revenue_year && latestRev.revenue_month) {
                const prevMatch = revList.find(r => r.revenue_year === (latestRev.revenue_year - 1) && r.revenue_month === latestRev.revenue_month);
                if (prevMatch) prevYearRev = prevMatch.revenue;
            }
            const revenue = {
                revenue: latestRev.revenue,
                revenue_month: latestRev.revenue_month,
                revenue_year: latestRev.revenue_year,
                prev_y_revenue: prevYearRev
            };

            const context = {
                symbol,
                name: item.info.name,
                industry: item.info.industry,
                priceData,
                fundamentals,
                institutional,
                margin: { margin_purchase_today_balance: 0, short_sale_today_balance: 0 },
                revenue,
                news: (item.news || []).map(n => ({ title: n.title, publish_at: n.publish_at })),
                generatedAt: formatTaiwanTime()
            };

            const result = await generateAIReport(symbol, 'stock_analysis_report', context);
            if (result.success) {
                successCount++;
                console.log(`✅ Success (${result.sentimentScore})`);
            } else {
                failCount++;
                console.log(`❌ Failed: ${result.error}`);
            }
        } catch (err) {
            failCount++;
            console.log(`❌ Error: ${err.message}`);
        }

        if (i % 5 === 0 && i > 0) await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n✨ Part ${partNum} Complete: ${successCount} Success, ${failCount} Fail`);
    await pool.end();
}

// Part 3: 200-300
injectBatchPart(3, 200, 300).then(() => process.exit(0));
