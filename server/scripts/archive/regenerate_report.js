const { generateAIReport } = require('../utils/ai_service');

async function run() {
    const symbol = '2330';
    console.log(`🚀 Regenerating AI Report for ${symbol}...`);
    const result = await generateAIReport(symbol);
    
    if (result.success) {
        console.log(`✅ Report regenerated successfully for ${symbol}`);
        console.log('--- REPORT PREVIEW ---');
        console.log(result.content.substring(0, 500) + '...');
        process.exit(0);
    } else {
        console.error(`❌ Report generation failed: ${result.error}`);
        process.exit(1);
    }
}

run();
