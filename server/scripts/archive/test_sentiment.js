const NewsSentiment = require('../utils/newsSentiment');
const { end } = require('../db');

async function test() {
    console.log('🧪 測試 NewsSentiment 模組...');
    
    // 測試 1: 識別個股
    const symbols = await NewsSentiment.identifyStocks('台積電 (2330) 營收創歷史新高', '法人大幅加碼 2317 鴻海');
    console.log('識別個股:', symbols);

    // 測試 2: 情緒分析
    const bullishRes = NewsSentiment.analyzeSentiment('營收創歷史新高，展望佳', '法人看好未來發展，積極買進');
    console.log('利多測試:', JSON.stringify(bullishRes, null, 2));

    const bearishRes = NewsSentiment.analyzeSentiment('營收衰退，財測下修', '裁員警訊頻傳，賣壓沉重');
    console.log('利空測試:', JSON.stringify(bearishRes, null, 2));

    await end();
}

test();
