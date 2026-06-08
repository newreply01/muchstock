const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { getLiveSchedulerStatus } = require('../scheduler');

// --- 監控系統 API ---

/**
 * GET /api/monitor/status
 * 取得系統服務狀態及資料擷取進度
 */
router.get('/status', async (req, res) => {
    try {
        // 1. 資料庫連線狀態 (簡單查詢)
        let dbStatus = 'DOWN';
        try {
            const dbRes = await pool.query('SELECT 1 as is_alive');
            if (dbRes.rows.length > 0 && dbRes.rows[0].is_alive === 1) {
                dbStatus = 'UP';
            }
        } catch (dbErr) {
            console.error('Monitor DB Check Error:', dbErr);
        }

        // 2. 系統排程健康狀態 (由 scheduler 寫入)
        let schedulerStatus = { status: 'UNKNOWN', last_check: null };
        try {
            const sysRes = await pool.query(
                `SELECT status, check_time 
                 FROM system_status 
                 WHERE service_name = 'scheduler' 
                 ORDER BY check_time DESC LIMIT 1`
            );
            if (sysRes.rows.length > 0) {
                schedulerStatus = {
                    status: sysRes.rows[0].status,
                    last_check: sysRes.rows[0].check_time
                };
            }
        } catch (sysErr) {
            // 忽略錯誤，可能是 table 還沒建好
        }

        // 2.5 取得各個 JS 程式的最後執行狀態 + 記憶體中即時狀態 (以 Promise.all 並行查詢優化效能)
        const liveStatusMap = getLiveSchedulerStatus ? getLiveSchedulerStatus() : {};
        const scriptNames = ['twse_fetcher.js', 'news_fetcher.js', 'finmind_fetcher.js', 'calc_health_scores.js', 'realtime_crawler.js', 'updateDailyStats'];
        let scriptStatusList = [];

        try {
            const promises = scriptNames.map(async (sName) => {
                const sRes = await pool.query(
                    `SELECT status, message, check_time 
                     FROM system_status 
                     WHERE service_name = $1 
                     ORDER BY check_time DESC LIMIT 1`, [sName]
                );
                const liveStatus = liveStatusMap[sName] || 'UNKNOWN';
                if (sRes.rows.length > 0) {
                    return {
                        script: sName,
                        live_status: liveStatus,
                        db_last_status: sRes.rows[0].status,
                        message: sRes.rows[0].message,
                        last_run: sRes.rows[0].check_time
                    };
                } else {
                    return {
                        script: sName,
                        live_status: liveStatus,
                        db_last_status: 'UNKNOWN',
                        message: '尚無執行紀錄',
                        last_run: null
                    };
                }
            });
            scriptStatusList = await Promise.all(promises);
        } catch (sysErr) {
            console.error('Monitor Script Check Error:', sysErr);
        }

        // 3. 各項資料最新同步進度 (使用 Window Function 優化原本 O(N^2) 複雜度的慢查詢，執行時間從 8.5s 縮短至 28ms)
        const progressRes = await pool.query(`
            WITH ranked_progress AS (
                SELECT 
                    dataset,
                    last_sync_date,
                    data_count,
                    status,
                    MAX(last_sync_date) OVER(PARTITION BY dataset) as max_ts,
                    (MAX(last_sync_date) OVER(PARTITION BY dataset))::date as max_date,
                    ROW_NUMBER() OVER(PARTITION BY dataset ORDER BY last_sync_date DESC) as rn
                FROM fm_sync_progress
            )
            SELECT 
                dataset,
                max_ts as last_updated,
                MAX(CASE WHEN rn = 1 THEN status END) as status,
                SUM(CASE WHEN last_sync_date >= max_date THEN data_count ELSE 0 END)::bigint as recent_count
            FROM ranked_progress
            GROUP BY dataset, max_ts
            ORDER BY dataset
        `);

        // 將資料轉成前端好用的格式，並加上排程說明
        const syncDetails = progressRes.rows.map(row => {
            // 對應 FinMind 資料集名稱設定說明 (可依實際狀況調整)
            let description = ''; // 排程說明
            let usage = '';       // 資料用途說明
            let script = '';
            let name = row.dataset; // 友善名稱

            // 對應 FinMind 資料集名稱設定說明 (可依實際狀況調整)
            // 對應 FinMind 資料集名稱設定說明 (可依實際狀況調整)
            switch (row.dataset) {
                case 'TaiwanStockPrice':
                    name = '台股日K線';
                    usage = '收盤價、成交量、最高/最低價';
                    script = 'twse_fetcher.js';
                    description = '15:00 初步 / 21:45 補全';
                    break;
                case 'TaiwanStockDayTrading':
                    name = '當沖交易';
                    usage = '每日現股當沖買賣成交金額與股數';
                    script = 'twse_fetcher.js';
                    description = '15:00 初步 / 21:45 補全';
                    break;
                case 'TaiwanStockMarginPurchaseShortSale':
                    name = '融資融券 (個股)';
                    usage = '各別股票之信用交易餘額與增減';
                    script = 'twse_fetcher.js';
                    description = '15:00 初步 / 21:45 補全';
                    break;
                case 'TaiwanStockTotalMarginPurchaseShortSale':
                    name = '融資融券 (全市場)';
                    usage = '全市場（大盤）信用交易總額與增減';
                    script = 'twse_fetcher.js';
                    description = '21:45 更新 (TWSE/TPEx 直連)';
                    break;
                case 'TaiwanStockInstitutional':
                case 'TaiwanStockInstitutionalInvestorsBuySell':
                    name = '三大法人買賣超 (個股)';
                    usage = '各別股票之法人買賣金額與張數';
                    script = 'twse_fetcher.js';
                    description = '15:00 初步 / 21:45 補全';
                    break;
                case 'TaiwanStockTotalInstitutionalInvestors':
                    name = '三大法人買賣超 (全市場)';
                    usage = '全市場（大盤）法人買賣超總計';
                    script = 'twse_fetcher.js';
                    description = '21:45 更新 (TWSE/TPEx 直連)';
                    break;
                case 'TaiwanStockFinancialStatements':
                    name = '財務報表 (損益表)';
                    usage = '各別股票之損益表 (每季)';
                    script = 'finmind_fetcher.js';
                    description = '每週六 04:00 更新';
                    break;
                case 'TaiwanStockBalanceSheet':
                    name = '財務報表 (資產負債表)';
                    usage = '各別股票之資產負債表 (每季)';
                    script = 'finmind_fetcher.js';
                    description = '每週六 04:00 更新';
                    break;
                case 'TaiwanStockCashFlowsStatement':
                    name = '財務報表 (現金流量表)';
                    usage = '各別股票之現金流量表 (每季)';
                    script = 'finmind_fetcher.js';
                    description = '每週六 04:00 更新';
                    break;
                case 'TaiwanStockMonthRevenue':
                    name = '每月營收';
                    usage = '每月營收動態與 YoY 成長率';
                    script = 'finmind_fetcher.js';
                    description = '每月 1-15 日 19:00 更新';
                    break;
                case 'TaiwanStockDividend':
                    name = '股利政策';
                    usage = '歷史配股配息日期與金額';
                    script = 'finmind_fetcher.js';
                    description = '每週六 04:00 更新';
                    break;
                case 'TaiwanStockBrokerTrading':
                    name = '分點進出';
                    usage = '各大證券分點個股買賣明細 (籌碼)';
                    script = 'finmind_fetcher.js';
                    description = '交易日 18:30 更新';
                    break;
                case 'TaiwanStockPER':
                    name = '評分/本益比';
                    usage = '日計本益比、本淨比與現金殖利率';
                    script = 'finmind_fetcher.js';
                    description = '交易日 18:30 更新';
                    break;
                case 'TaiwanStockHoldingSharesPer':
                    name = '股東持股分級';
                    usage = '大戶/散戶每週持股比例變動';
                    script = 'finmind_fetcher.js';
                    description = '每週六 06:00 更新';
                    break;
                case 'TaiwanStockInfo':
                    name = '個股基本資料';
                    usage = '產業分類、股本、上市日期等';
                    script = 'finmind_fetcher.js';
                    description = '每週六 04:00 更新';
                    break;
                case 'TaiwanStockNews':
                case 'News':
                    name = '財經新聞';
                    usage = '即時新聞推播與歷史查詢';
                    script = 'news_fetcher.js';
                    description = '每小時更新';
                    break;
                case 'TaiwanStockTotalReturnIndex':
                    name = '報酬指數';
                    usage = '大盤加權與報酬指數';
                    script = 'twse_fetcher.js';
                    description = '15:00 更新';
                    break;
                case 'TaiwanSecuritiesTraderInfo':
                    name = '證券商資訊';
                    usage = '券商代碼、名稱與分點基本資訊';
                    script = 'finmind_fetcher.js';
                    description = '每月 1 日更新';
                    break;
                case 'TaiwanStockDelisting':
                    name = '下市櫃資訊';
                    usage = '歷史已下市或合併之股份紀錄';
                    script = 'finmind_fetcher.js';
                    description = '每月更新';
                    break;
                case 'TaiwanStockTradingDate':
                    name = '交易日曆';
                    usage = '證交所開休市日期對照表';
                    script = 'finmind_fetcher.js';
                    description = '每年年初更新';
                    break;
                case 'FinMindDaily':
                    name = 'FinMind 綜合日更新';
                    usage = '綜合更新：分點進出、本益比、持股分級';
                    script = 'finmind_fetcher.js';
                    description = '盤後獨立批次';
                    break;
                default:
                    script = '未知';
                    description = '背景自動擷取中';
                    usage = '相關個股數據';
            }

            return {
                id: row.dataset,
                dataset: name,
                usage: usage,
                last_updated: row.last_updated,
                script: script,
                description: description,
                status: row.status,
                data_count: row.recent_count || 0
            };
        });

        // 3.5 手動加入「即時數據」同步狀態 (因為它不在 fm_sync_progress 中)
        try {
            const rtRes = await pool.query('SELECT MAX(trade_time) as last_tick FROM realtime_ticks');
            if (rtRes.rows.length > 0 && rtRes.rows[0].last_tick) {
                syncDetails.unshift({
                    id: 'Realtime行情數據',
                    dataset: 'Realtime行情數據',
                    usage: '當前盤中即時報價與成交明細',
                    last_updated: rtRes.rows[0].last_tick,
                    script: 'realtime_crawler.js',
                    description: '盤中每數秒更新'
                });
            }
        } catch (rtErr) {
            console.error('Monitor Realtime Check Error:', rtErr);
        }

        // 3.6 加入「AI 報告生成進度」
        try {
            const aiRes = await pool.query(`
                SELECT 
                    report_date, 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    MAX(completed_at) as last_update
                FROM ai_generation_queue
                WHERE report_date = (SELECT MAX(report_date) FROM ai_generation_queue)
                GROUP BY report_date
            `);

            if (aiRes.rows.length > 0) {
                const row = aiRes.rows[0];
                const dateStr = row.report_date instanceof Date 
                    ? new Date(row.report_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
                    : row.report_date;
                const percent = ((row.completed / row.total) * 100).toFixed(1);
                
                syncDetails.push({
                    id: 'AI_Queue',
                    dataset: `AI 報告生成 (${dateStr})`,
                    usage: `對 ${dateStr} 之 2100+ 檔標的進度 AI 模型深度分析`,
                    last_updated: row.last_update || new Date().toISOString(), // 避免 Invalid Date
                    script: 'update_ai_reports.js',
                    description: `進度: ${row.completed} / ${row.total} (${percent}%)`,
                    status: row.completed === 0 ? 'no_data' : 'done'
                });
            }
        } catch (aiErr) {
            console.error('Monitor AI Queue Check Error:', aiErr);
        }

        res.json({
            success: true,
            status: {
                database: dbStatus,
                scheduler: schedulerStatus.status,
                scheduler_last_check: schedulerStatus.last_check,
                backend: 'UP' // 能到達這裡代表後端正常
            },
            script_status: scriptStatusList,
            sync_progress: syncDetails
        });

    } catch (err) {
        console.error('Monitor status error:', err);
        res.status(500).json({ success: false, error: 'Failed to retrieve monitor status' });
    }
});

/**
 * GET /api/monitor/ingestion-stats
 * 取得最近 14 天的資料寫入筆數統計
 */
router.get('/ingestion-stats', async (req, res) => {
    try {
        const days = req.query.days || 14;

        // 優化：在此即時觸發一次今天的統計更新，確保前端永遠看到最新數字
        try {
            const { updateDailyStats } = require('../utils/statsAggregator');
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
            // 由於已針對今天/歷史資料庫查詢進行優化，統計耗時已降至 ~40ms，因此改為同步 await，確保前端第一次載入時就能立即獲取今日最新擷取筆數，無需手動刷新
            await updateDailyStats(todayStr);
        } catch (e) {
            console.error('Failed to quick update stats:', e);
        }

        // 直接從彙整表讀取最近 N 天的統計
        const statsRes = await pool.query(`
            SELECT 
                TO_CHAR(trade_date, 'YYYY-MM-DD') as date,
                price_count, inst_count, margin_count, news_count, 
                realtime_count, stats_count, health_count
            FROM system_ingestion_daily_stats
            WHERE trade_date >= CURRENT_DATE - INTERVAL '${days} days'
            ORDER BY trade_date ASC
        `);

        // 整理成前端預期的格式
        const statsArray = statsRes.rows.map(r => ({
            ...r,
            price_count: parseInt(r.price_count || 0, 10),
            inst_count: parseInt(r.inst_count || 0, 10),
            margin_count: parseInt(r.margin_count || 0, 10),
            news_count: parseInt(r.news_count || 0, 10),
            realtime_count: parseInt(r.realtime_count || 0, 10),
            stats_count: parseInt(r.stats_count || 0, 10),
            health_count: parseInt(r.health_count || 0, 10)
        }));

        res.json({
            success: true,
            data: statsArray
        });

    } catch (err) {
        console.error('Monitor ingestion stats error:', err);
        res.status(500).json({ success: false, error: 'Failed to retrieve ingestion stats' });
    }
});

/**
 * GET /api/monitor/all-stocks
 * 取得全市場股票代號與名稱，用於搜尋自動完成
 */
router.get('/all-stocks', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, error: 'Date is required for enhanced stock list' });
        }

        // 取得該日期的成交量與 AI 報告完成狀態
        const result = await pool.query(`
            SELECT 
                s.symbol, 
                s.name, 
                s.industry,
                COALESCE(p.volume, 0)::bigint as volume,
                (r.content IS NOT NULL) as has_report,
                r.created_at as processed_at
            FROM stocks s
            LEFT JOIN (
                SELECT symbol, volume 
                FROM daily_prices 
                WHERE trade_date = $1
            ) p ON s.symbol = p.symbol
            LEFT JOIN (
                SELECT symbol, created_at, content
                FROM ai_reports 
                WHERE report_date = $1
            ) r ON s.symbol = r.symbol
            WHERE s.symbol ~ '^[0-9]' 
            ORDER BY volume DESC
        `, [date]);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Failed to fetch enhanced stock list for monitor:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch stock list' });
    }
});

/**
 * GET /api/monitor/report-detail
 * 取得指定個股於特定日期的 AI 分析報告
 */
router.get('/report-detail', async (req, res) => {
    try {
        const { symbol, date } = req.query;
        if (!symbol || !date) {
            return res.status(400).json({ success: false, error: 'Symbol and Date are required' });
        }

        const result = await pool.query(
            `SELECT content, sentiment_score, report_date 
             FROM ai_reports 
             WHERE symbol = $1 AND report_date = $2`,
            [symbol, date]
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, data: null, message: '該日期尚無分析報告' });
        }

        const data = result.rows[0];
        if (data.sentiment_score > 1) {
            data.sentiment_score = data.sentiment_score / 100;
        }

        res.json({ success: true, data });
    } catch (err) {
        console.error('Failed to fetch report detail:', err);
        res.status(500).json({ success: false, error: 'Failed to retrieve report content' });
    }
});

module.exports = router;
