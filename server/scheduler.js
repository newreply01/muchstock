const cron = require('node-cron');
const { catchUp } = require('./twse_fetcher');
const { syncAllNews } = require('./news_fetcher');
const { 
    syncAllStocksFinancials, 
    syncTradingDate, 
    syncDailyBrokerAndPER, 
    syncWeeklyHolding, 
    syncMonthlyRevenueBatch 
} = require('./finmind_fetcher');
const { calculateAndStoreIndicators } = require('./calculate_indicators');
const { runAll: runHealthCheck } = require('./scripts/calc_health_scores');
let syncHistoricalMinuteBatch;
try {
    const histModule = require('./historical_tick_sync');
    syncHistoricalMinuteBatch = histModule.syncHistoricalMinuteBatch;
} catch (e) {
    console.warn('Optional module historical_tick_sync not found, skipping related tasks.');
}
const { pool, query } = require('./db');
const DataLCM = require('./scripts/data_lcm');
const { sync: syncToSupabase } = require('./scripts/sync_realtime_supabase');

async function logScriptStatus(serviceName, status, message) {
    try {
        await pool.query(
            `INSERT INTO system_status (service_name, status, message) VALUES ($1, $2, $3)`,
            [serviceName, status, message]
        );
    } catch (err) {
        console.error(`Failed to log script status for ${serviceName}:`, err.message);
    }
}

// 追蹤排程的即時運行狀態
const scheduledTasks = {};
const isTaskRunning = {};

function initTaskTracking(scriptName, task) {
    scheduledTasks[scriptName] = task;
    isTaskRunning[scriptName] = false;
}

function getLiveSchedulerStatus() {
    const statusMap = {};
    for (const [scriptName, task] of Object.entries(scheduledTasks)) {
        if (!task) {
            statusMap[scriptName] = 'NOT_SCHEDULED';
        } else if (isTaskRunning[scriptName]) {
            statusMap[scriptName] = 'RUNNING';
        } else {
            statusMap[scriptName] = 'WAITING'; // 排程已註冊，等待時間到
        }
    }
    return statusMap;
}

function startScheduler() {
    // 每交易日 15:00 更新行情 (初步價格同步)
    const fetcherTask1500 = cron.schedule('0 15 * * 1-5', async () => {
        console.log('📅 定時排程開始 (15:00)：抓取今日行情...');
        await runTaskSafely('twse_fetcher.js', catchUp, '盤後行情初步抓取');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('twse_fetcher.js_1500', fetcherTask1500);

    // 每交易日 21:45 補抓籌碼資料 (三大法人、融資融券更新後)
    const fetcherTask2145 = cron.schedule('45 21 * * 1-5', async () => {
        console.log('📅 定時排程開始 (21:45)：補抓今日籌碼資料...');
        await runTaskSafely('twse_fetcher.js', catchUp, '今日法人與資券補抓');
        const { syncTotalInstitutional, syncTotalMargin } = require('./finmind_fetcher');
        await runTaskSafely('finmind_total_institutional', syncTotalInstitutional, '大盤三大法人同步');
        await runTaskSafely('finmind_total_margin', syncTotalMargin, '大盤融資券同步');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('twse_fetcher.js_2145', fetcherTask2145);

    // 每小時更新新聞
    const newsTask = cron.schedule('0 * * * *', async () => {
        console.log('📰 定時排程開始：更新新聞...');
        await runTaskSafely('news_fetcher.js', syncAllNews, '每小時新聞更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('news_fetcher.js', newsTask);

    // 每週六 04:00 更新基本面資料 (FinMind)
    const finmindTask = cron.schedule('0 4 * * 6', async () => {
        console.log('🚀 定時排程開始：更新基本面資料...');
        await runTaskSafely('finmind_fetcher.js', syncAllStocksFinancials, '每週基本面更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('finmind_fetcher.js', finmindTask);

    // 每日 18:30 更新 FinMind 每日異動資料 (分點買賣、本益比)
    const finmindDailyTask = cron.schedule('30 18 * * 1-5', async () => {
        console.log('🚀 定時排程開始 (18:30)：更新 FinMind 每日異動資料...');
        await runTaskSafely('finmind_fetcher.js', syncDailyBrokerAndPER, '每日盤後分點與本益比更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('finmind_daily', finmindDailyTask);

    // 每月 1~15 號每日 19:00 更新每月營收
    const finmindMonthlyRevenueTask = cron.schedule('0 19 1-15 * *', async () => {
        console.log('🚀 定時排程開始 (19:00)：更新每月營收...');
        await runTaskSafely('finmind_fetcher.js', syncMonthlyRevenueBatch, '每日每月營收更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('finmind_monthly_revenue', finmindMonthlyRevenueTask);

    // 每週六 06:00 更新股權分散表 (大戶/散戶持股分級)
    const finmindWeeklyHoldingTask = cron.schedule('0 6 * * 6', async () => {
        console.log('🚀 定時排程開始 (06:00)：更新集保股權分散表...');
        await runTaskSafely('finmind_fetcher.js', syncWeeklyHolding, '每週持股分級更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('finmind_weekly_holding', finmindWeeklyHoldingTask);

    // 每日 04:00 同步交易日資訊 (FinMind)
    const tradingDateTask = cron.schedule('0 4 * * *', async () => {
        console.log('📅 定時排程開始 (04:00)：同步交易日資訊...');
        await runTaskSafely('finmind_fetcher.js', syncTradingDate, '每日交易日資訊同步');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('trading_date_sync', tradingDateTask);
    
    // 每月 1 日 04:30 更新券商分點資訊 (FinMind)
    const brokerTask = cron.schedule('30 4 1 * *', async () => {
        console.log('🏢 定時排程開始 (04:30)：更新券商分點資訊...');
        const { syncBrokers } = require('./finmind_fetcher');
        await runTaskSafely('finmind_brokers', syncBrokers, '每月券商資訊更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('finmind_brokers', brokerTask);

    // 每交易日 15:30 第一次計算全股健診排行 (初步價格更新後)
    const healthTask1530 = cron.schedule('30 15 * * 1-5', async () => {
        console.log('🏥 定時排程開始 (15:30)：計算全股健診排行 (初步)...');
        await runTaskSafely('calc_health_scores.js', runHealthCheck, '初步全股健診排行計算');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('calc_health_scores.js_1530', healthTask1530);

    // 每交易日 15:45 計算技術指標 (價格同步後)
    const indicatorsTask = cron.schedule('45 15 * * 1-5', async () => {
        console.log('📈 定時排程開始 (15:45)：計算技術指標...');
        await runTaskSafely('calculate_indicators.js', calculateAndStoreIndicators, '技術指標計算');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('calculate_indicators.js', indicatorsTask);

    // 每交易日 22:15 第二次計算全股健診排行 (籌碼資料補全後)
    const healthTask2215 = cron.schedule('15 22 * * 1-5', async () => {
        console.log('🏥 定時排程開始 (22:15)：計算全股健診排行 (最終)...');
        await runTaskSafely('calc_health_scores.js', runHealthCheck, '最終全股健診排行計算');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('calc_health_scores.js_2215', healthTask2215);

    // 每交易日 22:30 初始化 AI 生成任務佇列 (健診資料與籌碼完整後執行)
    const aiQueueTask2230 = cron.schedule('30 22 * * 1-5', async () => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        console.log(`🤖 定時排程開始 (22:30)：初始化 ${today} AI 生成任務佇列...`);
        const { initAiQueue } = require('./scripts/init_ai_queue');
        await runTaskSafely('init_ai_queue.js', async () => {
            await initAiQueue(today);
        }, `${today} AI 生成任務初始化`);
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('init_ai_queue.js', aiQueueTask2230);

    // 每交易日 16:30 補抓今日歷史 1 分K (盤後資料完整後執行)
    if (syncHistoricalMinuteBatch) {
        const histTickTask = cron.schedule('30 16 * * 1-5', async () => {
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
            console.log(`📈 定時排程開始：補抓 ${today} 歷史 1 分K...`);
            await runTaskSafely('historical_tick_sync.js', async () => {
                await syncHistoricalMinuteBatch(today, 100);
            }, `${today} 歷史分時補抓`);
        }, {
            scheduled: true,
            timezone: 'Asia/Taipei'
        });
        initTaskTracking('historical_tick_sync.js', histTickTask);
    }

    // 每日 23:55 更新系統寫入統計表
    const statsUpdateTask = cron.schedule('55 23 * * *', async () => {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        console.log(`📊 定時排程開始 (23:55)：更新 ${todayStr} 系統寫入筆數統計...`);
        const { updateDailyStats } = require('./utils/statsAggregator');
        await runTaskSafely('updateDailyStats', async () => {
            await updateDailyStats(todayStr);
        }, '系統寫入統計表每日更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('update_ingestion_stats', statsUpdateTask);
    
    // 每日 08:30 進行資料庫維護 (分割表建立、資料降階、過期資料清理)
    const dataLcmTask = cron.schedule('30 8 * * *', async () => {
        console.log('🏗️ 定時排程開始 (08:30)：執行 Data LCM 資料庫維護任務...');
        await runTaskSafely('data_lcm', async () => {
            await DataLCM.run();
        }, '資料庫維護與生命週期管理');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('data_lcm', dataLcmTask);

    // 每交易日 07:50 盤前新聞掃描 + 重大新聞觸發 AI 報告更新
    const preMarketNewsTask = cron.schedule('50 7 * * 1-5', async () => {
        console.log('📰🔴 盤前新聞掃描 (07:50)：抓取最新新聞並檢查重大變動...');
        await runTaskSafely('pre_market_news_scan', async () => {
            // 1. 先抓取最新新聞
            await syncAllNews();
            
            // 2. 找出近 12 小時新聞情緒劇烈變化的個股，觸發報告重新生成
            const { refreshReportsForHighImpactNews } = require('./scripts/pre_market_refresh');
            await refreshReportsForHighImpactNews();
        }, '盤前新聞掃描與報告更新');
    }, {
        scheduled: true,
        timezone: 'Asia/Taipei'
    });
    initTaskTracking('pre_market_news_scan', preMarketNewsTask);

    // 執行 Supabase 即時同步 (每 10 分鐘)
    cron.schedule('*/10 * * * *', async () => {
        try {
            // 檢查資料庫是否存活
            await pool.query('SELECT 1');

            // 寫入健康紀錄
            await logScriptStatus('scheduler', 'UP', 'Scheduler is running normally');

            const now = new Date();
            const tpeTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
            const hours = tpeTime.getHours();
            const minutes = tpeTime.getMinutes();
            const day = tpeTime.getDay();
            const timeInMinutes = hours * 60 + minutes;

            // 交易時段 (週一至五 09:00 - 15:40) - 暫時停用同步以測試本地效能
            /*
            if (day >= 1 && day <= 5 && timeInMinutes >= 9 * 60 && timeInMinutes <= 15 * 60 + 40) {
                console.log('[Sync] Triggering Supabase tick sync...');
                await syncToSupabase();
            }
            */
        } catch (err) {
            console.error('系統狀態檢查或同步失敗:', err.message);
        }
    });

    console.log(' 排程系統已啟動 (時區: Asia/Taipei)');
}

// 輔助函式：確保非同步任務在失敗時會紀錄狀態
async function runTaskSafely(taskName, taskFn, description) {
    if (isTaskRunning[taskName]) {
        console.log(`⚠️ 任務 ${taskName} 正正在執行中，跳過本次調度。`);
        return;
    }
    
    isTaskRunning[taskName] = true;
    await logScriptStatus(taskName, 'RUNNING', `正在執行: ${description}`);
    try {
        await taskFn();
        await logScriptStatus(taskName, 'SUCCESS', `${description}完成`);
    } catch (err) {
        console.error(`❌ 任務 ${taskName} 執行失敗:`, err.message);
        await logScriptStatus(taskName, 'FAILED', `執行失敗: ${err.message}`);
    } finally {
        isTaskRunning[taskName] = false;
    }
}

module.exports = { startScheduler, getLiveSchedulerStatus };
