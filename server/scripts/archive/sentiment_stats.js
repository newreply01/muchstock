const { query, end } = require('../db');

async function stats() {
    try {
        console.log('📊 新聞情緒分析統計報告');
        
        // 1. 最近 5 則利多個股新聞
        const bullish = await query(`
            SELECT n.title, s.symbol, s.sentiment, s.score, s.reason, n.publish_at
            FROM news_stock_sentiment s
            JOIN news n ON s.news_id = n.news_id
            WHERE s.sentiment = 'Bullish'
            ORDER BY n.publish_at DESC
            LIMIT 5
        `);
        console.log('\n🔥 最新利多新聞示例:');
        bullish.rows.forEach(r => console.log(`[${r.symbol}] ${r.title} (分: ${r.score})`));

        // 2. 被提及次數最多的個股 (Top 10)
        const trending = await query(`
            SELECT symbol, COUNT(*) as count, AVG(score) as avg_sentiment
            FROM news_stock_sentiment
            GROUP BY symbol
            ORDER BY count DESC
            LIMIT 10
        `);
        console.log('\n📈 熱門提到個股及其平均情緒:');
        trending.rows.forEach(r => console.log(`${r.symbol}: ${r.count} 則新聞, 平均情緒: ${parseFloat(r.avg_sentiment).toFixed(2)}`));

    } catch (err) {
        console.error(err);
    } finally {
        await end();
    }
}

stats();
