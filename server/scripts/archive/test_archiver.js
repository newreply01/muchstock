const TickArchiver = require('../utils/tickArchiver');
const { end } = require('../db');

async function test() {
    console.log('🧪 測試 TickArchiver 邏輯...');
    try {
        // 測試今日 (週日)
        const today = new Date();
        console.log(`今日日期: ${today.toISOString().split('T')[0]}`);
        
        const isTrading = await TickArchiver.isTradingDay(today);
        console.log(`今日是否為交易日: ${isTrading ? '✅ 是' : '❌ 否'}`);

        console.log('\n🎬 模擬執行歸檔任務...');
        await TickArchiver.archiveAndTruncate();
        
        console.log('\n✅ 測試完成。');
    } catch (e) {
        console.error('❌ 測試失敗:', e);
    } finally {
        await end();
    }
}

test();
