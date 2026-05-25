const { query, end } = require('../db');
async function f() {
    try {
        await query('TRUNCATE news_stock_sentiment');
        console.log('✅ 已清空 news_stock_sentiment 表。');
    } catch (e) { console.error(e); }
    finally { await end(); }
}
f();
