const { pool } = require('../db');

/**
 * 更新或回補指定日期的寫入筆數統計 (system_ingestion_daily_stats)
 * @param {string} dateStr - 欲統計的日期字串，格式為 'YYYY-MM-DD'
 */
async function updateDailyStats(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    
    console.log(`[StatsAggregator] 正在統計 ${dateStr} 的寫入筆數...`);

    try {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        const isToday = dateStr === todayStr;

        // 為了效能，我們對各表使用 Promise.all 同時統計指定日期的筆數
        const queries = [
            // 0: price_count
            pool.query(`SELECT COUNT(*) as count FROM daily_prices WHERE trade_date = $1`, [dateStr]),
            
            // 1: inst_count
            pool.query(`SELECT COUNT(*) as count FROM institutional WHERE trade_date = $1`, [dateStr]),
            
            // 2: margin_count
            pool.query(`SELECT COUNT(*) as count FROM fm_margin_trading WHERE date = $1`, [dateStr]),
            
            // 3: news_count
            pool.query(`SELECT COUNT(*) as count FROM news WHERE publish_at >= $1::timestamp AND publish_at < $1::timestamp + INTERVAL '1 day'`, [dateStr]),
            
            // 4: realtime_count (今天只查即時表，歷史天只查歷史表，避免 UNION ALL 掃描大表)
            isToday 
                ? pool.query(`SELECT COUNT(*) as count FROM realtime_ticks WHERE trade_time >= $1::timestamp AND trade_time < $1::timestamp + INTERVAL '1 day'`, [dateStr])
                : pool.query(`SELECT COUNT(*) as count FROM realtime_ticks_history WHERE trade_time >= $1::timestamp AND trade_time < $1::timestamp + INTERVAL '1 day'`, [dateStr]),
            
            // 5: stats_count (fm_day_trading + fm_total_institutional + fm_total_margin)
            pool.query(`
                SELECT SUM(count) as count FROM (
                    SELECT COUNT(*) as count FROM fm_day_trading WHERE date = $1
                    UNION ALL
                    SELECT COUNT(*) as count FROM fm_total_institutional WHERE date = $1
                    UNION ALL
                    SELECT COUNT(*) as count FROM fm_total_margin WHERE date = $1
                ) t
            `, [dateStr]),

            // 6: health_count
            pool.query(`SELECT COUNT(*) as count FROM stock_health_scores WHERE created_at >= $1::timestamp AND created_at < $1::timestamp + INTERVAL '1 day'`, [dateStr])
        ];

        const results = await Promise.all(queries);

        const price_count = parseInt(results[0].rows[0]?.count || 0, 10);
        const inst_count = parseInt(results[1].rows[0]?.count || 0, 10);
        const margin_count = parseInt(results[2].rows[0]?.count || 0, 10);
        const news_count = parseInt(results[3].rows[0]?.count || 0, 10);
        const realtime_count = parseInt(results[4].rows[0]?.count || 0, 10);
        const stats_count = parseInt(results[5].rows[0]?.count || 0, 10);
        const health_count = parseInt(results[6].rows[0]?.count || 0, 10);

        // 寫入 / 更新 (Upsert) 統計表
        await pool.query(`
            INSERT INTO system_ingestion_daily_stats 
                (trade_date, price_count, inst_count, margin_count, news_count, realtime_count, stats_count, health_count, updated_at)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (trade_date) 
            DO UPDATE SET 
                price_count = EXCLUDED.price_count,
                inst_count = EXCLUDED.inst_count,
                margin_count = EXCLUDED.margin_count,
                news_count = EXCLUDED.news_count,
                realtime_count = EXCLUDED.realtime_count,
                stats_count = EXCLUDED.stats_count,
                health_count = EXCLUDED.health_count,
                updated_at = EXCLUDED.updated_at
        `, [
            dateStr, price_count, inst_count, margin_count, 
            news_count, realtime_count, stats_count, health_count
        ]);

        console.log(`[StatsAggregator] ${dateStr} 統計完成。價格:${price_count}, 法人:${inst_count}, 即時:${realtime_count}`);
        
        return {
            date: dateStr,
            price_count,
            inst_count,
            margin_count,
            news_count,
            realtime_count,
            stats_count,
            health_count
        };
    } catch (error) {
        console.error(`[StatsAggregator] 更新 ${dateStr} 統計失敗:`, error);
        throw error;
    }
}

module.exports = {
    updateDailyStats
};
