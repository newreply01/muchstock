import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Clock, RefreshCw, AlertCircle, Calendar, Search, FileText, BarChart2, ChevronRight } from 'lucide-react';
import StructuredReportView from '../shared/StructuredReportView';
import { useTheme } from '../../context/ThemeContext';

export default function MonitorPage() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState('system'); // 'system' | 'ai-reports'
    const [statusData, setStatusData] = useState(null);
    const [statsData, setStatsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetchTime, setLastFetchTime] = useState(null);

    // AI Report Tab States
    const [allStocks, setAllStocks] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    // New Control States
    const [sortKey, setSortKey] = useState('volume'); // 'symbol' | 'volume' | 'processed_at'
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterOnlyCompleted, setFilterOnlyCompleted] = useState(false);
    const [isStocksLoading, setIsStocksLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch status
            const statusRes = await fetch('/api/monitor/status');
            const statusJson = await statusRes.json();

            // Fetch stats
            const statsRes = await fetch('/api/monitor/ingestion-stats?days=7');
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
        // Optional: Auto-refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchStocks();
    }, [reportDate]);

    const fetchStocks = async () => {
        if (!reportDate) return;
        setIsStocksLoading(true);
        try {
            const res = await fetch(`/api/monitor/all-stocks?date=${reportDate}`);
            const json = await res.json();
            if (json.success) setAllStocks(json.data);
        } catch (err) {
            console.error('Error fetching stocks:', err);
        } finally {
            setIsStocksLoading(false);
        }
    };

    const fetchReport = async (symbol, date) => {
        if (!symbol || !date) return;
        setReportLoading(true);
        try {
            const res = await fetch(`/api/monitor/report-detail?symbol=${symbol}&date=${date}`);
            const json = await res.json();
            if (json.success) setReportData(json.data);
            else setReportData(null);
        } catch (err) {
            console.error('Error fetching report:', err);
            setReportData(null);
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStock && reportDate) {
            fetchReport(selectedStock.symbol, reportDate);
        }
    }, [selectedStock, reportDate]);

    const filteredStocks = allStocks
        .filter(s => {
            const queryMatch = searchQuery 
                ? (s.symbol.includes(searchQuery) || s.name.includes(searchQuery))
                : true;
            const completedMatch = filterOnlyCompleted ? s.has_report : true;
            return queryMatch && completedMatch;
        })
        .sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            // Specific logic for processed_at (dates)
            if (sortKey === 'processed_at') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else if (sortKey === 'volume') {
                valA = parseInt(valA) || 0;
                valB = parseInt(valB) || 0;
            }

            if (sortOrder === 'asc') return valA > valB ? 1 : -1;
            else return valA < valB ? 1 : -1;
        });

    const completionCount = allStocks.filter(s => s.has_report).length;
    const completionRate = allStocks.length > 0 ? (completionCount / allStocks.length * 100).toFixed(1) : 0;

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

    // ─── Static definitions (no backend needed) ────────────────────────────────
    // Maps FinMind dataset name → script name + badge colour
        const DATASET_SCRIPT_MAP = {
        'TaiwanStockPrice': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockPriceTick': { script: 'realtime_crawler.js', color: 'bg-green-100 text-green-800 border border-green-200' },
        'TaiwanStockInstitutional': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockInstitutionalInvestorsBuySell': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockMarginPurchaseShortSale': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockDayTrading': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
        'TaiwanStockMonthRevenue': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockTotalInstitutionalInvestors': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockTotalMarginPurchaseShortSale': { script: 'finmind_fetcher.js', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
        'TaiwanStockTotalReturnIndex': { script: 'twse_fetcher.js', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
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
    // ──────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fade-in-20">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('system')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'system' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Server className="w-4 h-4" />
                    系統健康狀態
                </button>
                <button
                    onClick={() => setActiveTab('ai-reports')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'ai-reports' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText className="w-4 h-4" />
                    AI 投資報告查詢
                </button>
            </div>

            {activeTab === 'system' ? (
                <>
                {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-brand-primary" />
                        系統監控中心
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        監控資料庫、後端服務狀態，以及資料擷取排程的執行進度。
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-gray-500">頁面最後更新時間</div>
                        <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {lastFetchTime ? formatDate(lastFetchTime) : '載入中...'}
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>立即更新</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-red-800">資料載入失敗</h3>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {statusData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Database Status */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col pt-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Database className="w-5 h-5" />
                            </div>
                            <StatusBadge status={statusData.status.database} />
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">資料庫狀態</h3>
                        <p className="text-xl font-bold text-gray-900 mt-1">PostgreSQL</p>
                    </div>

                    {/* Backend API Status */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col pt-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Server className="w-5 h-5" />
                            </div>
                            <StatusBadge status={statusData.status.backend} />
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">後端 API 服務</h3>
                        <p className="text-xl font-bold text-gray-900 mt-1">Node.js Express</p>
                    </div>

                    {/* Scheduler Status */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col pt-6 lg:col-span-2">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Activity className="w-5 h-5" />
                            </div>
                            <StatusBadge status={statusData.status.scheduler} />
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-gray-500 text-sm font-medium">背景排程系統 (Scheduler)</h3>
                                <p className="text-base font-bold text-gray-900 mt-1 truncate">負責執行所有的自動化資料同步任務</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400">上次檢查</div>
                                <div className="text-sm font-medium text-gray-600">{formatDate(statusData.status.scheduler_last_check)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingestion Stats Chart (Bar Chart visualization) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Calendar className="w-5 h-5 text-brand-primary" />
                    <h2 className="text-lg font-bold text-gray-900">近 7 天資料擷取筆數 (寫入趨勢)</h2>
                </div>

                {statsData.length > 0 ? (
                    <div className="pt-10 pb-4 overflow-visible">
                        <div className="w-full">
                            {/* Simple Bar Chart Implementation using divs */}
                            <div className="flex items-end gap-1 h-64 relative border-b border-gray-200 pb-2 overflow-visible">
                                {/* Find max value for scaling */}
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
                                                {/* Tooltip (now with space to render) */}
                                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 shadow-xl border border-gray-700 text-white text-xs rounded-lg p-2.5 whitespace-nowrap z-[100] pointer-events-none transform -translate-x-1/2 left-1/2">
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
                                                <div className="text-[10px] text-gray-500 mt-2 rotate-45 origin-left w-full h-8 flex-shrink-0 leading-none">{day.date.substring(5)}</div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        {loading ? '載入中...' : '無可用資料'}
                    </div>
                )}
            </div>

            {/* Daily Ingestion Details Table */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    每日資料擷取詳情
                </h2>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
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
                        <tbody className="divide-y divide-gray-100">
                            {[...statsData].reverse().map((day, idx) => {
                                const total = day.price_count + day.inst_count + day.margin_count + (day.news_count || 0) +
                                    (day.realtime_count || 0) + (day.stats_count || 0) + (day.health_count || 0);
                                const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;
                                return (
                                    <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                                        <td className="px-5 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                                            {day.date}
                                            {isWeekend && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">週末</span>}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono text-gray-900">{day.price_count.toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-gray-900">{(day.inst_count + day.margin_count).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-blue-600 font-bold">{(day.realtime_count || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-indigo-600">{((day.stats_count || 0) + (day.health_count || 0)).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono text-gray-500">{(day.news_count || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-primary">{total.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                            {!statsData.length && !loading && (
                                <tr>
                                    <td colSpan="6" className="px-5 py-8 text-center text-gray-500">尚無每日統計資料</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Synchronization Details Table */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    各項資料來源同步進度
                </h2>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                            <tr>
                                <th className="px-5 py-3 font-semibold">資料集 (Dataset)</th>
                                <th className="px-5 py-3 font-semibold">擷取程式</th>
                                <th className="px-5 py-3 font-semibold">排程說明</th>
                                <th className="px-5 py-3 font-semibold">資料庫最後更新時間</th>
                                <th className="px-5 py-3 font-semibold text-right">狀態</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {statusData?.sync_progress?.filter(d => DATASET_SCRIPT_MAP[d.id])?.map((item, idx) => {
                                const isStale = new Date() - new Date(item.last_updated) > 3 * 24 * 60 * 60 * 1000;
                                const scriptInfo = DATASET_SCRIPT_MAP[item.id] || { script: '未知', color: 'bg-gray-100 text-gray-600' };

                                return (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3.5 font-medium text-gray-900">{item.dataset}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${scriptInfo.color}`}>
                                                {scriptInfo.script}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-blue-600 font-medium">{item.description}</td>
                                        <td className="px-5 py-3.5">{formatDate(item.last_updated)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            {isStale ? (
                                                <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                                    <AlertCircle className="w-3.5 h-3.5" /> 較久未更新
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-green-600 bg-green-50 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                                    更新正常
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {!statusData?.sync_progress?.length && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-5 py-8 text-center text-gray-500">尚無同步紀錄</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* JS Script Monitoring Table */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-500" />
                    各項背景擷取程式 (Script) 執行狀態
                </h2>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                            <tr>
                                <th className="px-5 py-3 font-semibold">程式名稱 (.js)</th>
                                <th className="px-5 py-3 font-semibold">用途說明</th>
                                <th className="px-5 py-3 font-semibold text-blue-600">排程說明</th>
                                <th className="px-5 py-3 font-semibold">狀態與執行訊息</th>
                                <th className="px-5 py-3 font-semibold text-right">最後執行時間</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
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
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-gray-100 text-gray-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> 未知狀態
                                    </span>
                                );

                                if (liveStatus === 'WAITING') {
                                    liveBadge = (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> 排程已啟動 (待命/休市)
                                        </span>
                                    );
                                } else if (liveStatus === 'RUNNING') {
                                    liveBadge = (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                                            <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div> 正在擷取資料中...
                                        </span>
                                    );
                                } else if (liveStatus === 'NOT_SCHEDULED') {
                                    liveBadge = (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider bg-red-50 text-red-700">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {def.script === 'realtime_crawler.js' ? '服務未啟動' : '排程未載入'}
                                        </span>
                                    );
                                }

                                let dbStatusColor = 'text-gray-500';
                                if (dbStatus === 'SUCCESS') dbStatusColor = 'text-green-600';
                                if (dbStatus === 'FAILED') dbStatusColor = 'text-red-600';

                                return (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-gray-900">{def.script}</div>
                                            <div className="mt-2">{liveBadge}</div>
                                        </td>
                                        <td className="px-5 py-4 text-indigo-600 font-medium">{def.desc}</td>
                                        <td className="px-5 py-4 text-gray-500 text-xs">{def.schedule}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className={`text-xs font-bold tracking-wider ${dbStatusColor}`}>
                                                    歷史狀態: {dbStatus}
                                                </div>
                                                <div className="text-xs text-gray-500 line-clamp-2" title={message}>{message}</div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono text-xs text-gray-600">{formatDate(lastRun)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
                </>
            ) : (
                <div className="space-y-6">
                    {/* Search & Filter Header */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Autocomplete Search */}
                        <div className="relative col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">搜尋個股 (代號或名稱)</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="輸入如 2330 或 台積電..."
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
                                    value={selectedStock ? `${selectedStock.symbol} ${selectedStock.name}` : searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSelectedStock(null);
                                        setShowResults(true);
                                    }}
                                    onFocus={() => setShowResults(true)}
                                />
                                {selectedStock && (
                                    <button 
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                                        onClick={() => { setSelectedStock(null); setSearchQuery(''); }}
                                    >
                                        清除
                                    </button>
                                )}
                            </div>
                            
                            {/* Dropdown Results */}
                            {showResults && filteredStocks.length > 0 && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {filteredStocks.map(s => (
                                        <button
                                            key={s.symbol}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors border-b last:border-0 border-gray-100"
                                            onClick={() => {
                                                setSelectedStock(s);
                                                setShowResults(false);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <div>
                                                <span className="font-bold text-gray-900 mr-2">{s.symbol}</span>
                                                <span className="text-gray-600">{s.name}</span>
                                            </div>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s.industry}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Date Filter */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">報告日期</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Report Display */}
                    <div className="bg-white min-h-[700px] rounded-3xl border border-gray-100 shadow-md overflow-hidden flex flex-col">
                        {!selectedStock ? (
                            <div className="flex-1 flex flex-col p-8">
                                {/* Dashboard Controls */}
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
                                            <BarChart2 className="w-6 h-6 text-brand-primary" />
                                            全市場 AI 報告進度
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span className="font-bold text-gray-700">{completionCount}</span> / {allStocks.length} 家已完成
                                            </div>
                                            <div className="flex-1 w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-brand-primary transition-all duration-1000" 
                                                    style={{ width: `${completionRate}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-sm font-black text-brand-primary">{completionRate}%</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Sort Controls */}
                                        <div className="flex p-0.5 bg-gray-50 rounded-xl border border-gray-200">
                                            {[
                                                { key: 'volume', label: '成交量', icon: <BarChart2 className="w-3 h-3"/> },
                                                { key: 'symbol', label: '代號', icon: <Search className="w-3 h-3"/> },
                                                { key: 'processed_at', label: '處理時間', icon: <Clock className="w-3 h-3"/> }
                                            ].map(opt => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => {
                                                        if (sortKey === opt.key) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                                        else { setSortKey(opt.key); setSortOrder('desc'); }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${sortKey === opt.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    {opt.icon}
                                                    {opt.label}
                                                    {sortKey === opt.key && (sortOrder === 'asc' ? '↑' : '↓')}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Filter Toggle */}
                                        <button
                                            onClick={() => setFilterOnlyCompleted(!filterOnlyCompleted)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filterOnlyCompleted ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${filterOnlyCompleted ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                            僅顯示已完成
                                        </button>
                                    </div>
                                </div>
                                
                                {isStocksLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                                        <div className="w-10 h-10 border-4 border-gray-100 border-t-brand-primary rounded-full animate-spin"></div>
                                        <p className="mt-4 text-sm text-gray-400 font-bold">載入清單數據中...</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12">
                                            {filteredStocks.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    onClick={() => setSelectedStock(s)}
                                                    className={`group text-left p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden ${s.has_report ? 'bg-white border-green-100 shadow-sm shadow-green-500/5 hover:border-green-300' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-brand-primary'}`}
                                                >
                                                    {s.has_report && (
                                                        <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 animate-in zoom-in duration-500">
                                                            <Activity className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    <div className="text-xs font-black text-gray-400 mb-1 group-hover:text-brand-primary transition-colors flex items-center justify-between">
                                                        {s.symbol}
                                                        {s.processed_at && (
                                                            <span className="text-[9px] text-green-600/60 font-bold">
                                                                {new Date(s.processed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-gray-900 group-hover:scale-105 transition-transform origin-left truncate mb-2">{s.name}</div>
                                                    
                                                    <div className="flex items-center gap-1.5 opacity-60">
                                                        <BarChart2 className="w-3 h-3 text-gray-400" />
                                                        <span className="text-[10px] font-bold text-gray-500">
                                                            {(s.volume / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} 張
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                            {filteredStocks.length === 0 && (
                                                <div className="col-span-full py-20 text-center text-gray-400 font-bold">
                                                    沒有符合條件的標的
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : reportLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12">
                                <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-gray-600 font-bold">正在讀取 AI 分析報告...</p>
                            </div>
                        ) : reportData ? (
                            <>
                                <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300 ${
                                    isDark 
                                        ? 'bg-slate-900 border-slate-800 text-white' 
                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setSelectedStock(null)}
                                            className={`p-2 rounded-xl transition-colors group ${
                                                isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200/50 hover:bg-slate-200'
                                            }`}
                                            title="返回總覽"
                                        >
                                            <ChevronRight className={`w-5 h-5 rotate-180 transition-colors ${isDark ? 'text-white' : 'text-slate-700'}`} />
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h2 className="text-2xl font-bold">{selectedStock.symbol} {selectedStock.name}</h2>
                                                <span className={`text-sm px-2 py-0.5 rounded-full transition-colors ${
                                                    isDark ? 'opacity-80 bg-white/10 text-white' : 'bg-slate-200 text-slate-600 font-bold'
                                                }`}>{selectedStock.industry}</span>
                                            </div>
                                            <div className={`text-sm flex items-center gap-2 transition-colors ${
                                                isDark ? 'opacity-60 text-white' : 'text-slate-500'
                                            }`}>
                                                <Calendar className="w-4 h-4" />
                                                分析基準日: {reportData.report_date}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-4 p-3 px-5 rounded-2xl border transition-all ${
                                        isDark 
                                            ? 'bg-white/10 border-white/10' 
                                            : 'bg-slate-100 border-slate-200/80 shadow-sm'
                                    }`}>
                                        <div className="text-right">
                                            <div className={`text-[10px] uppercase tracking-wider font-bold transition-colors ${
                                                isDark ? 'opacity-60 text-white' : 'text-slate-500'
                                            }`}>情緒綜合評分</div>
                                            <div className={`text-xs uppercase tracking-widest mt-0.5 transition-colors ${
                                                isDark ? 'opacity-40 text-white' : 'text-slate-400'
                                            }`}>Sentiment Score</div>
                                        </div>
                                        <div className={`w-12 h-12 rounded-full border-4 border-brand-primary flex items-center justify-center text-sm font-black shadow-lg shadow-brand-primary/20 ${
                                            isDark ? 'text-white bg-brand-primary/10' : 'text-brand-primary bg-brand-primary/5'
                                        }`}>
                                            {(reportData.sentiment_score * 100).toFixed(0)}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 md:p-8 overflow-y-auto">
                                    <StructuredReportView reportText={reportData.content} />
                                </div>
                                <div className="p-6 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                                    本報告由台股智能篩選器 AI 自動生成，僅供研究參考，不構成任何投資建議。
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="w-10 h-10 text-red-200" />
                                </div>
                                <h3 className="text-lg font-bold text-red-800">無可用報告</h3>
                                <p className="text-sm mt-2 max-w-xs">{selectedStock.name} 在 {reportDate} 尚未生成 AI 分析報告。</p>
                                <button 
                                    className="mt-6 px-6 py-2 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20"
                                    onClick={() => alert('手動生成功能開發中...')}
                                >
                                    立即觸發生成任務
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
