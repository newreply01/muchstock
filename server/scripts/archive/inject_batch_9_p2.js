const fs = require('fs');
const path = require('path');
const { generateAIReport } = require('../utils/ai_service');
const { pool } = require('../db');
const { formatTaiwanTime } = require('../utils/timeUtils');

async function injectBatch() {
    console.log('🚀 Starting injection for Batch 9 Part 2 (Symbols 51-100)...');
    
    const contextPath = path.join(__dirname, 'batch_context_9.json');
    if (!fs.existsSync(contextPath)) {
        console.error(`❌ Error: ${contextPath} not found.`);
        process.exit(1);
    }

    const allContext = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
    // Symbols 51-100 (indices 50 to 99)
    const batchData = allContext.slice(50, 100);
    console.log(`📊 Processing ${batchData.length} symbols.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < batchData.length; i++) {
        const item = batchData[i];
        const symbol = item.symbol;
        
        process.stdout.write(`[⏳] Processing ${symbol} (${i + 1}/${batchData.length})... `);

        try {
            // 1. Prepare Price Data
            const latestPrice = item.prices && item.prices[0] ? item.prices[0] : {};
            const rawPatterns = latestPrice.patterns;
            const patterns = Array.isArray(rawPatterns) 
                ? rawPatterns 
                : (typeof rawPatterns === 'string' ? rawPatterns.split(',').map(p => p.trim()) : []);

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
                patterns: patterns
            };

            // 2. Prepare Fundamentals
            const fundamentals = {
                pe_ratio: item.fundamentals.pe_ratio,
                pb_ratio: item.fundamentals.pb_ratio,
                dividend_yield: item.fundamentals.dividend_yield
            };

            // 3. Prepare Institutional (Last 5)
            const instList = item.institutional || [];
            const last5Inst = instList.slice(0, 5);
            const institutional = {
                foreign_sum: last5Inst.reduce((sum, row) => sum + parseFloat(row.foreign_net || 0), 0),
                trust_sum: last5Inst.reduce((sum, row) => sum + parseFloat(row.trust_net || 0), 0),
                dealer_sum: last5Inst.reduce((sum, row) => sum + parseFloat(row.dealer_net || 0), 0)
            };

            // 4. Prepare Revenue (Latest and Prev Year Same Month)
            const revList = item.revenue || [];
            const latestRev = revList[0] || {};
            let prevYearRev = null;
            if (latestRev.revenue_year && latestRev.revenue_month) {
                const prevYear = latestRev.revenue_year - 1;
                const prevMatch = revList.find(r => r.revenue_year === prevYear && r.revenue_month === latestRev.revenue_month);
                if (prevMatch) prevYearRev = prevMatch.revenue;
            }
            const revenue = {
                revenue: latestRev.revenue,
                revenue_month: latestRev.revenue_month,
                revenue_year: latestRev.revenue_year,
                prev_y_revenue: prevYearRev
            };

            // 5. Margin Info
            const margin = {
                margin_purchase_today_balance: 0,
                short_sale_today_balance: 0
            };

            // 6. News
            const news = (item.news || []).map(n => ({
                title: n.title,
                publish_at: n.publish_at
            }));

            // 7. Assemble Context
            const context = {
                symbol,
                name: item.info.name,
                industry: item.info.industry,
                priceData,
                fundamentals,
                institutional,
                margin,
                revenue,
                news,
                generatedAt: formatTaiwanTime()
            };

            // 8. Generate and Inject Report
            const result = await generateAIReport(symbol, 'stock_analysis_report', context);
            
            if (result.success) {
                successCount++;
                console.log(`✅ Success (Score: ${result.sentimentScore})`);
            } else {
                failCount++;
                console.log(`❌ Failed: ${result.error}`);
            }

        } catch (err) {
            failCount++;
            console.log(`❌ Error: ${err.message}`);
        }

        // Delay to respect API limits
        if (i % 5 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n✨ Injection complete:');
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed:  ${failCount}`);
    console.log(`   Total:   ${batchData.length}`);

    await pool.end();
    process.exit(0);
}

injectBatch();
