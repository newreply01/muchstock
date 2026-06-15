import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Clock, RefreshCw, AlertCircle, Calendar, BarChart2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function MonitorPage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [statusData, setStatusData] = useState(null);
    const [statsData, setStatsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetchTime, setLastFetchTime] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const ts = new Date().getTime();
            // Fetch status
            const statusRes = await fetch(`/api/monitor/status?t=${ts}`);
            const statusJson = await statusRes.json();

            // Fetch stats
            const statsRes = await fetch(`/api/monitor/ingestion-stats?days=7&t=${ts}`);
            const statsJson = await statsRes.json();

            if (statusJson.success) setStatusData(statusJson);
            else throw new Error(statusJson.error || 'Failed to fetch status');

            if (statsJson.success) setStatsData(statsJson.data);
            else throw new Error(statsJson.error || 'Failed to fetch stats');

            setLastFetchTime(new Date());
        } catch (err) {
            console.error('Error fetching monitor data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Helper components
    const StatusBadge = ({ status }) => {
        const isUp = status === 'UP';
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isUp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {isUp ? '正常運作' : '服務異常'}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '無資料';
        const d = new Date(dateString);
        return d.toLocaleString('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const getStaleThresholdDays = (datasetId) => {
        const quarterly = ['TaiwanStockFinancialStatements', 'TaiwanStockBalanceSheet', 'TaiwanStockCashFlowsStatement', 'TaiwanStockDividend'];
        const monthly = ['TaiwanStockMonthRevenue', 'TaiwanStockHoldingSharesPer'];
        const staticData = ['TaiwanStockInfo', 'TaiwanStockDelisting', 'TaiwanStockTradingDate', 'TaiwanSecuritiesTraderInfo'];
        
        if (quarterly.includes(datasetId)) return 120; // 財報、股利約一季更新一次
        if (monthly.includes(datasetId)) return 45;    // 營收、董監持股約一個月更新一次
        if (staticData.includes(datasetId)) return 3650; // 基本資料、下市資訊等幾乎不更新
        return 3; // 每日交易資料 (依需求維持為 3 天)
    };

    // Maps FinMind dataset name → script name + badge colour
    const DATASET_SCRIPT_MAP = {
        'TaiwanStockPrice': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockPriceTick': { script: 'realtime_crawler.js', color: 'bg-green-100 text-green-800 border border-green-200' },
        'TaiwanStockInstitutional': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockInstitutionalInvestorsBuySell': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockMarginPurchaseShortSale': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockDayTrading': { script: 'fast_daily_sync.js', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
        'TaiwanStockMonthRevenue': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockTotalInstitutionalInvestors': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockTotalMarginPurchaseShortSale': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockTotalReturnIndex': { script: 'fast_daily_sync.js', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
        'TaiwanStockFinancialStatements': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockBalanceSheet': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockCashFlowsStatement': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockPER': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockBrokerTrading': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockHoldingSharesPer': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockDividend': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockInfo': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockDelisting': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockTradingDate': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanSecuritiesTraderInfo': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'News': { script: 'news_fetcher.js', color: 'bg-orange-100 text-orange-800 border border-orange-200' },
        'FinMindDaily': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'Realtime行情數據': { script: 'realtime_crawler.js', color: 'bg-green-100 text-green-800 border border-green-200' },
        'AI_Queue': { script: 'update_ai_reports.js', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' }
    };

    // Known background scripts — names/descriptions always shown; status from API
    const KNOWN_SCRIPTS = [
        { script: 'realtime_crawler.js', desc: '即時看盤行情爬蟲 (盤中每數秒更新)', schedule: '常駐執行 (守護程式)' },
        { script: 'twse_fetcher.js', desc: '每日盤後資料 (收盤價、當沖、法人、融資券)', schedule: '15:00 (初步價格) / 21:45 (籌碼補全)' },
        { script: 'news_fetcher.js', desc: '財經新聞同步', schedule: '每小時' },
        { script: 'finmind_fetcher.js', desc: '財報基本面資料 (損益表、毛利、營收、分點、持股分級、本益比)', schedule: '每小時 (分點/籌碼) / 每週六 04:00 (財報)' },
        { script: 'calc_health_scores.js', desc: '全股個股健診排行計算', schedule: '15:30 (初算) / 22:15 (最終)' },
        { script: 'update_ai_reports.js', desc: 'AI 報告生成中心 (Ollama/Gemini)', schedule: '每交易日 22:30 (常駐 Worker)' },
        { script: 'updateDailyStats', desc: '每日系統寫入筆數匯總計算', schedule: '每天 23:55' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fade-in-20">
            {/* Header section */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl border shadow-sm transition-colors duration-300 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-805'
            }`}>
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>
                        <Activity className="w-6 h-6 text-brand-primary" />
                        系統監控中心
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        監控資料庫、後端服務狀態，以及資料擷取排程的執行進度。
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>頁面最後更新時間</div>
                        <div className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {lastFetchTime ? formatDate(lastFetchTime) : '載入中...'}
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>立即更新</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className={`border rounded-xl p-4 flex items-start gap-3 ${
                    isDark ? 'bg-red-950/20 border-red-900 text-red-400' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className={`font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>資料載入失敗</h3>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {statusData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Database Status */}
                    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col pt-6 transition-colors duration-300 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-850'
                    }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isDark ? 'bg-blue-950/40 text-blue-400' : 'bg-blue-50 text-blue-600'
                            }`}>
                                <Database className="w-5 h-5" />
                            </div>
                            <StatusBadge status={statusData.status.database} />
                        </div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>資料庫狀態</h3>
                        <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>PostgreSQL</p>
                    </div>

                    {/* Backend API Status */}
                    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col pt-6 transition-colors duration-300 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-850'
                    }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isDark ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                                <Server className="w-5 h-5" />
                            </div>
                            <StatusBadge status={statusData.status.backend} />
                        </div>
                        <h3 className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>後端 API 服務</h3>
                        <p className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>Node.js Express</p>
                    </div>

                    {/* Scheduler Status */}
                    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col pt-6 lg:col-span-2 transition-colors duration-300 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-850'
                    }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isDark ? 'bg-purple-950/40 text-purple-400' : 'bg-purple-50 text-purple-600'
                            }`}>
                                <Activity className="w-5 h-5" />
                            </div>
                            <StatusBadge status={statusData.status.scheduler} />
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>背景排程系統 (Scheduler)</h3>
                                <p className={`text-base font-bold mt-1 truncate ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>負責執行所有的自動化資料同步任務</p>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>上次檢查</div>
                                <div className={`text-sm font-medium ${isDark ? 'text-slate-350' : 'text-gray-655'}`}>{formatDate(statusData.status.scheduler_last_check)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingestion Stats Chart (Bar Chart visualization) */}
            <div className={`p-6 rounded-2xl border shadow-sm transition-colors duration-300 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-805'
            }`}>
                <div className="flex items-center gap-2 mb-6">
                    <BarChart2 className="w-5 h-5 text-brand-primary" />
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>近 7 天資料擷取筆數 (寫入趨勢)</h2>
                </div>

                {statsData.length > 0 ? (
                    <div className="pt-10 pb-4 overflow-visible">
                        <div className="w-full">
                            <div className={`flex items-end gap-1 h-64 relative border-b pb-2 overflow-visible ${
                                  isDark ? 'border-slate-800' : 'border-gray-200 dark:border-slate-800'
                            }`}>
                                {(() => {
                                    const maxVal = Math.max(1, ...statsData.map(d =>
                                        d.price_count + d.inst_count + d.margin_count + (d.news_count || 0) +
                                        (d.realtime_count || 0) + (d.stats_count || 0) + (d.health_count || 0)
                                    ));

                                    return statsData.map((day, idx) => {
                                        const total = day.price_count + day.inst_count + day.margin_count + (day.news_count || 0) +
                                            (day.realtime_count || 0) + (day.stats_count || 0) + (day.health_count || 0);
                                        const hTotal = (total / maxVal) * 100;

                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                                {/* Tooltip */}
                                                <div className={`absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl text-xs rounded-lg p-2.5 whitespace-nowrap z-[100] pointer-events-none transform -translate-x-1/2 left-1/2 border ${
                                                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-900 border-gray-800 text-white'
                                                }`}>
                                                    <div className="font-bold border-b border-white/20 pb-1.5 mb-1.5 text-center">{day.date}</div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-gray-300">總寫入筆數:</span>
                                                        <span className="font-mono text-brand-primary font-bold">{total.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Single Bar */}
                                                <div className="w-full max-w-[40px] flex flex-col justify-end h-full">
                                                    <div style={{ height: `${hTotal}%` }} className="bg-brand-primary hover:bg-red-500 w-full rounded-t-sm transition-all duration-300 shadow-sm border border-brand-primary/20"></div>
                                                </div>

                                                {/* Date Label */}
                                                <div className={`text-[10px] mt-2 text-center w-full h-5 flex-shrink-0 leading-none ${
                                                      isDark ? 'text-slate-400' : 'text-gray-500'
                                                }`}>{day.date.substring(5)}</div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={`h-64 flex items-center justify-center border border-dashed rounded-xl ${
                        isDark ? 'text-slate-500 bg-slate-950/20 border-slate-800' : 'text-gray-400 bg-gray-50 border-gray-200 dark:border-slate-800'
                    }`}>
                        {loading ? '載入中...' : '無可用資料'}
                    </div>
                )}
            </div>

            {/* Daily Ingestion Details Table */}
            <div className={`p-6 rounded-2xl border shadow-sm mt-6 transition-colors duration-300 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-805'
            }`}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    每日資料擷取詳情
                </h2>

                <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-800' : 'border-gray-200 dark:border-slate-800'}`}>
                    <table className={`w-full text-left text-sm ${isDark ? 'text-slate-300' : 'text-gray-655'}`}>
                        <thead className={`border-b text-gray-705 ${
                            isDark ? 'bg-slate-800/80 border-slate-850 text-slate-200 font-bold' : 'bg-gray-50 border-gray-200 dark:border-slate-800 text-gray-700'
                        }`}>
                            <tr>
                                <th className="px-5 py-3 font-semibold">日期</th>
                                <th className="px-5 py-3 font-semibold text-right">收盤</th>
                                <th className="px-5 py-3 font-semibold text-right">法人/融資</th>
                                <th className="px-5 py-3 font-semibold text-right">即時行情</th>
                                <th className="px-5 py-3 font-semibold text-right">統計/健診</th>
                                <th className="px-5 py-3 font-semibold text-right">新聞</th>
                                <th className="px-5 py-3 font-semibold text-right text-brand-primary">總計</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
                            {[...statsData].reverse().map((day, idx) => {
                                const total = day.price_count + day.inst_count + day.margin_count + (day.news_count || 0) +
                                    (day.realtime_count || 0) + (day.stats_count || 0) + (day.health_count || 0);
                                const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;
                                return (
                                    <tr key={idx} className={`transition-colors ${
                                        isDark 
                                            ? (isWeekend ? 'bg-slate-950/20 hover:bg-slate-800/60' : 'hover:bg-slate-800/60') 
                                            : (isWeekend ? 'bg-gray-50/50 hover:bg-gray-50' : 'hover:bg-gray-50')
                                    }`}>
                                        <td className={`px-5 py-3.5 font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>
                                            {day.date}
                                            {isWeekend && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'
                                            }`}>週末</span>}
                                        </td>
                                        <td className={`px-5 py-3.5 text-right font-mono ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>{day.price_count.toLocaleString()}</td>
                                        <td className={`px-5 py-3.5 text-right font-mono ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>{(day.inst_count + day.margin_count).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-blue-500 font-bold">{(day.realtime_count || 0).toLocaleString()}</td>
                                        <td className={`px-5 py-3.5 text-right font-mono ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{((day.stats_count || 0) + (day.health_count || 0)).toLocaleString()}</td>
                                        <td className={`px-5 py-3.5 text-right font-mono ${isDark ? 'text-slate-400' : 'text-gray-555'}`}>{(day.news_count || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-primary">{total.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                            {!statsData.length && !loading && (
                                <tr>
                                    <td colSpan="7" className="px-5 py-8 text-center text-gray-500">尚無每日統計資料</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Synchronization Details Table */}
            <div className={`p-6 rounded-2xl border shadow-sm mt-6 transition-colors duration-300 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-850'
            }`}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    各項資料來源同步進度
                </h2>

                <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-800' : 'border-gray-200 dark:border-slate-800'}`}>
                    <table className={`w-full text-left text-sm ${isDark ? 'text-slate-300' : 'text-gray-655'}`}>
                        <thead className={`border-b text-gray-705 ${
                            isDark ? 'bg-slate-800/80 border-slate-850 text-slate-200 font-bold' : 'bg-gray-50 border-gray-200 dark:border-slate-800 text-gray-700'
                        }`}>
                            <tr>
                                <th className="px-5 py-3 font-semibold">資料集 (Dataset)</th>
                                <th className="px-5 py-3 font-semibold">擷取程式</th>
                                <th className="px-5 py-3 font-semibold">排程說明</th>
                                <th className="px-5 py-3 font-semibold">資料庫最後更新時間</th>
                                <th className="px-5 py-3 font-semibold text-right">資料筆數</th>
                                <th className="px-5 py-3 font-semibold text-right">狀態</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
                            {statusData?.sync_progress?.filter(d => DATASET_SCRIPT_MAP[d.id])?.map((item, idx) => {
                                const staleThresholdDays = getStaleThresholdDays(item.id);
                                const isStale = new Date() - new Date(item.last_updated) > staleThresholdDays * 24 * 60 * 60 * 1000;
                                const scriptInfo = DATASET_SCRIPT_MAP[item.id] || { script: '未知', color: 'bg-gray-100 text-gray-605' };

                                // 在深色模式下稍微調整標籤色彩
                                const dynamicBadgeColor = isDark 
                                    ? scriptInfo.color.replace('bg-blue-100 text-blue-800 border border-blue-200', 'bg-blue-950/60 text-blue-400 border border-blue-900/50')
                                                       .replace('bg-green-100 text-green-800 border border-green-200', 'bg-green-950/60 text-green-400 border border-green-900/50')
                                                       .replace('bg-purple-100 text-purple-800 border border-purple-200', 'bg-purple-950/60 text-purple-400 border border-purple-900/50')
                                                       .replace('bg-orange-100 text-orange-800 border border-orange-200', 'bg-orange-950/60 text-orange-400 border border-orange-900/50')
                                                       .replace('bg-indigo-100 text-indigo-800 border border-indigo-200', 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50')
                                    : scriptInfo.color;

                                return (
                                    <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50'}`}>
                                        <td className={`px-5 py-3.5 font-medium ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>{item.dataset}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${dynamicBadgeColor}`}>
                                                {scriptInfo.script}
                                            </span>
                                        </td>
                                        <td className={`px-5 py-3.5 font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{item.description}</td>
                                        <td className="px-5 py-3.5">{formatDate(item.last_updated)}</td>
                                        <td className="px-5 py-3.5 text-right font-mono font-medium">{item.data_count?.toLocaleString() || 0}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            {isStale ? (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                    isDark ? 'text-red-400 bg-red-950/30' : 'text-red-600 bg-red-50'
                                                }`}>
                                                    <AlertCircle className="w-3.5 h-3.5" /> 較久未更新
                                                </span>
                                            ) : item.status === 'no_data' ? (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                    isDark ? 'text-yellow-400 bg-yellow-950/30' : 'text-yellow-600 bg-yellow-50'
                                                }`}>
                                                    <AlertCircle className="w-3.5 h-3.5" /> 無資料更新
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                                    isDark ? 'text-green-400 bg-green-950/30' : 'text-green-600 bg-green-50'
                                                }`}>
                                                    更新正常
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {!statusData?.sync_progress?.length && !loading && (
                                <tr>
                                    <td colSpan="6" className="px-5 py-8 text-center text-gray-500">尚無同步紀錄</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* JS Script Monitoring Table */}
            <div className={`p-6 rounded-2xl border shadow-sm mt-6 transition-colors duration-300 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-850'
            }`}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-500" />
                    各項背景擷取程式 (Script) 執行狀態
                </h2>

                <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-800' : 'border-gray-200 dark:border-slate-800'}`}>
                    <table className={`w-full text-left text-sm ${isDark ? 'text-slate-300' : 'text-gray-655'}`}>
                        <thead className={`border-b text-gray-705 ${
                            isDark ? 'bg-slate-800/80 border-slate-850 text-slate-200 font-bold' : 'bg-gray-50 border-gray-200 dark:border-slate-800 text-gray-700'
                        }`}>
                            <tr>
                                <th className="px-5 py-3 font-semibold">程式名稱 (.js)</th>
                                <th className="px-5 py-3 font-semibold">用途說明</th>
                                <th className="px-5 py-3 font-semibold text-blue-600">排程說明</th>
                                <th className="px-5 py-3 font-semibold">狀態與執行訊息</th>
                                <th className="px-5 py-3 font-semibold text-right">最後執行時間</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-100'}`}>
                            {KNOWN_SCRIPTS.map((def, idx) => {
                                // Look up dynamic status from API
                                const apiItem = statusData?.script_status?.find(s => s.script === def.script);
                                const dbStatus = apiItem?.db_last_status || 'UNKNOWN';
                                let liveStatus = apiItem?.live_status || 'UNKNOWN';
                                const message = apiItem?.message || '尚無執行紀錄';
                                const lastRun = apiItem?.last_run || null;

                                // 特別處理 realtime_crawler: 判斷資料庫最後打卡時間是否在 5 分鐘內
                                if (def.script === 'realtime_crawler.js') {
                                    if (lastRun && (new Date() - new Date(lastRun)) < 5 * 60 * 1000) {
                                        liveStatus = (dbStatus === 'WAITING' || message.includes('Sleeping')) ? 'WAITING' : 'RUNNING';
                                    } else {
                                        liveStatus = 'NOT_SCHEDULED'; // 代表超過五分鐘沒打卡，程序已關閉
                                    }
                                }

                                let liveBadge = (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> 未知狀態
                                    </span>
                                );

                                if (liveStatus === 'WAITING') {
                                    liveBadge = (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                            isDark ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        } shadow-sm`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> 排程已啟動 (待命/休市)
                                        </span>
                                    );
                                } else if (liveStatus === 'RUNNING') {
                                    liveBadge = (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                            isDark ? 'bg-blue-950/40 text-blue-400 border border-blue-900/50' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                        } shadow-sm`}>
                                            <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div> 正在擷取資料中...
                                        </span>
                                    );
                                } else if (liveStatus === 'NOT_SCHEDULED') {
                                    liveBadge = (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                            isDark ? 'bg-red-950/40 text-red-400' : 'bg-red-50 text-red-700'
                                        }`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {def.script === 'realtime_crawler.js' ? '服務未啟動' : '排程未載入'}
                                        </span>
                                    );
                                }

                                let dbStatusColor = isDark ? 'text-slate-400' : 'text-gray-500';
                                if (dbStatus === 'SUCCESS') dbStatusColor = 'text-green-500 font-bold';
                                if (dbStatus === 'FAILED') dbStatusColor = 'text-red-500 font-bold';

                                return (
                                    <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50'}`}>
                                        <td className="px-5 py-4">
                                            <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>{def.script}</div>
                                            <div className="mt-2">{liveBadge}</div>
                                        </td>
                                        <td className={`px-5 py-4 font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{def.desc}</td>
                                        <td className={`px-5 py-4 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{def.schedule}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className={`text-xs font-bold tracking-wider ${dbStatusColor}`}>
                                                    歷史狀態: {dbStatus}
                                                </div>
                                                <div className={`text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} title={message}>{message}</div>
                                            </div>
                                        </td>
                                        <td className={`px-5 py-4 text-right font-mono text-xs ${isDark ? 'text-slate-400' : 'text-gray-650'}`}>{formatDate(lastRun)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
