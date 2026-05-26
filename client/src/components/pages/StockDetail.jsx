import React, { useState, useEffect } from 'react'
import {
    X,
    TrendingUp,
    BarChart3,
    PieChart,
    Calendar,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Activity,
    CheckCircle2,
    Circle,
    Download,
    FileText,
    RefreshCw,
    Search,
    TrendingDown
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import StructuredReportView from '../shared/StructuredReportView'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend
} from 'recharts'
import { getStockFinancials, getInstitutionalData } from '../../utils/api'
import RevenueView from '../charts/RevenueView'
import ValuationView from '../charts/ValuationView'
import MACDView from '../charts/MACDView'
import KDView from '../charts/KDView'
import NewsBoard from './NewsBoard'
import RSIView from '../charts/RSIView'
import DMIView from '../charts/DMIView'
import StockChart from '../charts/StockChart'
import RealtimeView from '../charts/RealtimeView'
import TrendView from '../charts/TrendView'
import TradingSignalsView from '../charts/TradingSignalsView'
import WaveView from '../charts/WaveView'
import StockDashboard from '../charts/StockDashboard'
import AlertsView from '../shared/AlertsView'
import MainForceView from '../charts/MainForceView'
import FinancialStatementsView from '../charts/FinancialStatementsView'
import StockSearchAutocomplete from '../forms/StockSearchAutocomplete'
import ValuationRiverView from '../charts/ValuationRiverView'
import StockCompareView from '../charts/StockCompareView'
import EventCalendar from '../shared/EventCalendar'
import BrokerTracking from '../charts/BrokerTracking'
import QuickDiagnosisView from '../charts/QuickDiagnosisView'
import StockNewsEventsView from '../shared/StockNewsEventsView'

const SIDEBAR_MENU = [
    { id: 'overview', label: '全景分析' },
    { id: 'ai_report', label: 'AI 分析報告' },
    { id: 'technical', label: '技術指標' },
    {
        id: 'chips',
        label: '籌碼大戶',
        children: [
            { id: 'institutional', label: '三大法人' },
            { id: 'force_detail', label: '主力明細' },
            { id: 'margin_trade', label: '融資融券' },
            { id: 'broker_trace', label: '分點追蹤' }
        ]
    },
    {
        id: 'financials',
        label: '財務狀況',
        children: [
            {
                id: 'profitability',
                label: '獲利能力',
                children: [
                    { id: 'margin_trend', label: '毛利趨勢' },
                    { id: 'eps_trend', label: 'EPS走勢' },
                    { id: 'roe_roa', label: 'ROE/ROA' }
                ]
            },
            { id: 'revenue_growth', label: '營收成長' },
            {
                id: 'reports',
                label: '財務報表',
                children: [
                    { id: 'balance_sheet', label: '資產負債' },
                    { id: 'income_statement', label: '損益表' },
                    { id: 'cash_flow', label: '現金流量' }
                ]
            },
            { id: 'dividend', label: '股利政策' }
        ]
    },
    { id: 'news_events', label: '新聞大事' }
];

const CLASSIC_PATTERNS = [
    { id: 'red_three_soldiers', name: '紅三兵', type: 'bullish', en: 'Red Three Soldiers', desc: '連續三天收紅K，顯示多頭強勢' },
    { id: 'three_black_crows', name: '三隻烏鴉', type: 'bearish', en: 'Three Black Crows', desc: '連續三天收黑K，顯示空頭強勢' },
    { id: 'morning_star', name: '晨星', type: 'bullish', en: 'Morning Star', desc: '跌勢末端出現轉折，可能反轉向上' },
    { id: 'evening_star', name: '夜星', type: 'bearish', en: 'Evening Star', desc: '漲勢末端出現轉折，可能反轉向下' },
    { id: 'bullish_engulfing', name: '吞噬型態', type: 'bullish', en: 'Bullish Engulfing', desc: '陽線完全包覆前一陰線，強烈看漲' },
    { id: 'bearish_engulfing', name: '空頭吞噬', type: 'bearish', en: 'Bearish Engulfing', desc: '陰線完全包覆前一陽線，強烈看跌' },
    { id: 'piercing_line', name: '貫穿/烏雲', type: 'neutral', en: 'Piercing/Dark Cloud', desc: '穿透前日陰線實體中心點以上' },
    { id: 'hammer', name: '鎚子線', type: 'bullish', en: 'Hammer', desc: '長下影線實體小，底部反轉訊號' },
    { id: 'inverted_hammer', name: '倒鎚子', type: 'bullish', en: 'Inverted Hammer', desc: '長上影線實體小，通常出現在底部' },
    { id: 'hanging_man', name: '上吊線', type: 'bearish', en: 'Hanging Man', desc: '高檔出現的長下影線，警示訊號' },
    { id: 'shooting_star', name: '射擊之星', type: 'bearish', en: 'Shooting Star', desc: '高檔出現的長上影線，可能見頂' },
    { id: 'three_inside_up', name: '三內升', type: 'bullish', en: 'Three Inside Up', desc: '母子型態後隔日收高，多頭確認' },
    { id: 'three_inside_down', name: '三內降', type: 'bearish', en: 'Three Inside Down', desc: '母子型態後隔日收低，空頭確認' }
];

const getTaipeiTime = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const dateMap = {};
    parts.forEach(p => { dateMap[p.type] = p.value; });
    
    const year = parseInt(dateMap.year);
    const month = parseInt(dateMap.month);
    const day = parseInt(dateMap.day);
    const hour = parseInt(dateMap.hour);
    const minute = parseInt(dateMap.minute);
    
    const localDate = new Date(year, month - 1, day, hour, minute);
    
    return {
        year,
        month,
        day,
        hour,
        minute,
        dayOfWeek: localDate.getDay(), // 0 = 週日, 1 = 週一, ..., 6 = 週六
        formattedDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    };
};

const getDefaultReportDate = () => {
    const tpe = getTaipeiTime();
    const baseDate = new Date(tpe.year, tpe.month - 1, tpe.day);
    
    const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const r = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${r}`;
    };

    // 1. 週末 (非交易日) 直接退回至週五
    if (tpe.dayOfWeek === 6) { // 週六 -> 退 1 天到週五
        const target = new Date(baseDate);
        target.setDate(target.getDate() - 1);
        return formatDate(target);
    }
    if (tpe.dayOfWeek === 0) { // 週日 -> 退 2 天到週五
        const target = new Date(baseDate);
        target.setDate(target.getDate() - 2);
        return formatDate(target);
    }

    // 2. 週一至週五 (交易日)
    if (tpe.hour < 14) {
        // 下午 14:00 前，預設為上一個交易日
        const target = new Date(baseDate);
        if (tpe.dayOfWeek === 1) { // 週一 -> 退 3 天到上週五
            target.setDate(target.getDate() - 3);
        } else { // 週二至週五 -> 退 1 天到昨天
            target.setDate(target.getDate() - 1);
        }
        return formatDate(target);
    }

    // 下午 14:00 後，預設為今日
    return tpe.formattedDate;
};

export default function StockDetail({ stock, onClose, isInline = false }) {
    const [financials, setFinancials] = useState(null)
    const [institutionalData, setInstitutionalData] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingChips, setLoadingChips] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [activeSubTab, setActiveSubTab] = useState(null)
    const [activeSubSubTab, setActiveSubSubTab] = useState(null)
    const [activePatterns, setActivePatterns] = useState([])
    const [indicatorStatus, setIndicatorStatus] = useState({ rsi: null, close: null, ma20: null })
    const [activePeriod, setActivePeriod] = useState('日K')
    const [activeFilter, setActiveFilter] = useState('all')
    const [activeIndicator, setActiveIndicator] = useState('kline')
    
    // AI 報告雙主題與載入狀態定義
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [reportDate, setReportDate] = useState(() => getDefaultReportDate())
    const [reportData, setReportData] = useState(null)
    const [reportLoading, setReportLoading] = useState(false)

    const fetchAIReport = async (symbol, date) => {
        if (!symbol || !date) return
        setReportLoading(true)
        try {
            const res = await fetch(`/api/monitor/report-detail?symbol=${symbol}&date=${date}`)
            const json = await res.json()
            if (json.success) setReportData(json.data)
            else setReportData(null)
        } catch (err) {
            console.error('Error fetching AI report:', err)
            setReportData(null)
        } finally {
            setReportLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'ai_report' && stock?.symbol && reportDate) {
            fetchAIReport(stock.symbol, reportDate)
        }
    }, [activeTab, stock?.symbol, reportDate])

    useEffect(() => {
        const fetchFinancials = async () => {
            try {
                setLoading(true)
                const data = await getStockFinancials(stock.symbol)
                setFinancials(data)
            } catch (err) {
                console.error('Error fetching financials:', err)
            } finally {
                setLoading(false)
            }
        }

        const fetchChips = async () => {
            setLoadingChips(true);
            try {
                const data = await getInstitutionalData(stock.symbol);
                setInstitutionalData(data);
            } catch (err) {
                console.error('Error fetching chips:', err);
            } finally {
                setLoadingChips(false);
            }
        };

        if (stock?.symbol) {
            fetchFinancials()
            fetchChips()
        }
    }, [stock])

    // 新增：處理內部搜尋連動
    const handleInternalStockSelect = (newStock) => {
        if (newStock && newStock.symbol !== stock.symbol) {
            // 透過 muchstock-select 直接傳遞完整股票資訊，達成即時連動
            window.dispatchEvent(new CustomEvent('muchstock-select', { detail: newStock }));
        }
    }

    if (!stock) return null

    // 格式化營收數據供圖表使用
    const revenueData = financials?.revenue?.map(item => ({
        name: `${item.revenue_year}/${item.revenue_month}`,
        revenue: Math.round(parseFloat(item.revenue) / 100) / 100 // 單位：億
    })).reverse() || []

    // 格式化 EPS 數據
    const epsData = financials?.eps?.map(item => {
        const dateStr = item.date ? new Date(item.date).toLocaleDateString('zh-TW', { year: '2-digit', month: '2-digit' }) : 'N/A';
        return {
            name: dateStr,
            eps: parseFloat(item.value)
        };
    }).reverse() || []

    const containerClasses = isInline
        ? "w-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
        : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200";

    const contentClasses = isInline
        ? "flex flex-col w-full"
        : "bg-white border border-slate-200 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden";

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>

                {/* Header with Integrated Search */}
                <div className="p-6 border-b border-slate-100 flex flex-col sticky top-0 bg-white/95 backdrop-blur-md z-30 gap-6">
                    {/* Top Row: Enlarged Search Bar */}
                    <div className="w-full max-w-2xl">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                            </div>
                            <StockSearchAutocomplete onSelectStock={handleInternalStockSelect} />
                        </div>
                    </div>

                    {/* Bottom Row: Stock Info & Actions */}
                    <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                                <TrendingUp className="text-brand-primary w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    {stock.name}
                                    <span className="text-slate-400 text-lg font-normal">{stock.symbol}</span>
                                </h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {stock.industry && (
                                        <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-widest bg-indigo-50 text-indigo-500 border border-indigo-100/50">
                                            {stock.industry}
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-widest
                                        ${stock.market === 'twse' ? 'bg-blue-50 text-blue-500 border border-blue-100/50' : 'bg-orange-50 text-orange-500 border border-orange-100/50'}`}>
                                        {stock.market === 'twse' ? 'TWSE 上市' : 'TPEX 上櫃'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {!isInline && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Horizontal Tabs - Level 0 */}
                    <div className="flex flex-row flex-nowrap overflow-x-auto border-b border-slate-100 bg-slate-50/50 flex-shrink-0 px-4 py-2 custom-scrollbar">
                        {SIDEBAR_MENU.map((item, idx) => {
                            if (item.type === 'header') {
                                return (
                                    <div key={idx} className="flex items-center px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap opacity-70 shrink-0">
                                        | {item.label} |
                                    </div>
                                )
                            }
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        // Reset subtabs when switching main tab
                                        if (item.children) {
                                            setActiveSubTab(item.children[0].id);
                                            if (item.children[0].children) {
                                                setActiveSubSubTab(item.children[0].children[0].id);
                                            } else {
                                                setActiveSubSubTab(null);
                                            }
                                        } else {
                                            setActiveSubTab(null);
                                            setActiveSubSubTab(null);
                                        }
                                    }}
                                    className={`shrink-0 whitespace-nowrap flex items-center justify-center px-4 py-2 text-sm transition-all rounded-full mx-1 ${isActive
                                        ? 'bg-brand-primary text-white font-black shadow-md'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Level 1 Tabs (SubTabs) */}
                    {SIDEBAR_MENU.find(m => m.id === activeTab)?.children && (
                        <div className="flex flex-row flex-nowrap overflow-x-auto border-b border-slate-100 bg-white flex-shrink-0 px-6 py-2.5 gap-2 custom-scrollbar">
                            {SIDEBAR_MENU.find(m => m.id === activeTab).children.map(subItem => {
                                const isSubActive = activeSubTab === subItem.id;
                                return (
                                    <button
                                        key={subItem.id}
                                        onClick={() => {
                                            setActiveSubTab(subItem.id);
                                            if (subItem.children) {
                                                setActiveSubSubTab(subItem.children[0].id);
                                            } else {
                                                setActiveSubSubTab(null);
                                            }
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isSubActive
                                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 ring-2 ring-indigo-500/10'
                                            : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                                            }`}
                                    >
                                        {subItem.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Level 2 Tabs (SubSubTabs) */}
                    {(() => {
                        const activeMain = SIDEBAR_MENU.find(m => m.id === activeTab);
                        const activeSub = activeMain?.children?.find(s => s.id === activeSubTab);
                        if (activeSub?.children) {
                            return (
                                <div className="flex flex-row flex-nowrap overflow-x-auto border-b border-slate-100 bg-slate-50/20 flex-shrink-0 px-8 py-2 gap-4 custom-scrollbar">
                                    {activeSub.children.map(subSubItem => {
                                        const isSubSubActive = activeSubSubTab === subSubItem.id;
                                        return (
                                            <button
                                                key={subSubItem.id}
                                                onClick={() => setActiveSubSubTab(subSubItem.id)}
                                                className={`text-[11px] font-bold tracking-tight transition-colors ${isSubSubActive
                                                    ? 'text-brand-primary underline underline-offset-4 decoration-2'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {subSubItem.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Summary Cards & Controls - Always Visible in Detail Body top */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 space-y-4">
                        {/* Control Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                                {['日K', '週K', '月K'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setActivePeriod(p)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activePeriod === p
                                            ? 'bg-slate-800 text-white'
                                            : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Export buttons removed as per cleanup request */}
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { id: 'bullish', label: '看漲型態偵測', count: activePatterns.filter(p => p.type === 'bullish').length, icon: TrendingUp, color: 'text-red-500', activeBg: 'bg-red-50 border-red-200 ring-1 ring-red-500', countBg: activePatterns.filter(p => p.type === 'bullish').length > 0 ? 'bg-red-500 text-white' : 'bg-white text-slate-400 border border-slate-100' },
                                { id: 'bearish', label: '看跌型態偵測', count: activePatterns.filter(p => p.type === 'bearish').length, icon: TrendingDown, color: 'text-green-600', activeBg: 'bg-green-50 border-green-200 ring-1 ring-green-600', countBg: activePatterns.filter(p => p.type === 'bearish').length > 0 ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border border-slate-100' },
                                { id: 'status', label: '技術指標狀態', count: 'Active', icon: Activity, color: 'text-blue-500', activeBg: 'bg-blue-50 border-blue-200', countBg: 'bg-blue-100 text-blue-700' },
                            ].map(card => (
                                <div
                                    key={card.id}
                                    onClick={() => setActiveFilter(prev => prev === card.id ? 'all' : card.id)}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${activeFilter === card.id ? card.activeBg : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100`}>
                                            <card.icon className={`w-5 h-5 ${card.color}`} />
                                        </div>
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stock status</span>
                                            <span className="font-bold text-slate-700 text-sm">{card.label}</span>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-md text-xs font-black transition-all ${card.countBg} shadow-sm`}>
                                        {card.id === 'status' ? (
                                            <div className="flex items-center gap-2 text-[10px]">
                                                <span className={indicatorStatus.rsi > 70 ? 'text-red-500' : indicatorStatus.rsi < 30 ? 'text-green-500' : ''}>RSI:{indicatorStatus.rsi?.toFixed(0) || '--'}</span>
                                                <span className={indicatorStatus.close > indicatorStatus.ma20 ? 'text-red-500' : 'text-green-500'}>MA:{indicatorStatus.close > indicatorStatus.ma20 ? '多' : '空'}</span>
                                            </div>
                                        ) : card.count > 0 ? (
                                            <div className="flex flex-col items-end leading-none">
                                                <span>{card.count}</span>
                                                <span className="text-[7px] font-bold mt-0.5 opacity-80">
                                                    最近: {activePatterns.filter(p => p.type === card.id).sort((a,b) => new Date(b.date) - new Date(a.date))[0]?.date.split('-').slice(1).join('/') || '--'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span>0</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white relative">
                        {activeTab === 'overview' ? (
                            <StockDashboard stock={stock} />
                        ) : activeTab === 'ai_report' ? (
                            <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300">
                                {/* AI Report Date and Score Header */}
                                <div className={`p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300 ${
                                    isDark 
                                        ? 'bg-slate-900 border-slate-800 text-white' 
                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                                            isDark ? 'bg-indigo-950/40 border-indigo-900/50 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-500'
                                        }`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold flex items-center gap-2">
                                                {stock.name} AI 投資分析報告
                                            </h2>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>報告日期:</span>
                                                <input 
                                                    type="date" 
                                                    className={`px-3 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-medium ${
                                                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-805'
                                                    }`}
                                                    value={reportDate}
                                                    onChange={(e) => setReportDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {reportData && (
                                        <div className={`flex items-center gap-4 p-3 px-5 rounded-2xl border transition-all ${
                                            isDark 
                                                ? 'bg-white/10 border-white/10' 
                                                : 'bg-white border-slate-200 shadow-sm'
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
                                    )}
                                </div>

                                {/* Content Display */}
                                {reportLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 min-h-[400px]">
                                        <div className={`w-10 h-10 border-4 rounded-full animate-spin ${
                                            isDark ? 'border-slate-800 border-t-brand-primary' : 'border-gray-100 border-t-brand-primary'
                                        }`}></div>
                                        <p className="mt-4 text-sm text-gray-400 font-bold">正在讀取 AI 分析報告...</p>
                                    </div>
                                ) : reportData ? (
                                    <div className={`border rounded-2xl overflow-hidden shadow-sm flex flex-col transition-colors duration-300 ${
                                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-150 text-slate-850'
                                    }`}>
                                        <div className={`p-6 md:p-8 flex-1 ${isDark ? 'bg-slate-950/20' : 'bg-slate-50/10'}`}>
                                            <div className="max-w-3xl mx-auto">
                                                <StructuredReportView reportText={reportData.content} />
                                            </div>
                                        </div>
                                        <div className={`p-6 border-t text-center text-xs ${
                                            isDark ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-gray-50 border-gray-100 text-gray-400'
                                        }`}>
                                            本報告由台股智能篩選器 AI 自動生成，僅供研究參考，不構成任何投資建議。
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl min-h-[400px] ${
                                        isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'
                                    }`}>
                                        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mb-4">
                                            <FileText className="w-8 h-8 text-red-300 dark:text-red-800/60" />
                                        </div>
                                        <h3 className="text-lg font-bold text-red-800 dark:text-red-400">無可用報告</h3>
                                        <p className="text-sm mt-2 max-w-xs">{stock.name} 在 {reportDate} 尚未生成 AI 分析報告。</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'chips' ? (
                            <MainForceView
                                symbol={stock.symbol}
                                subTab={activeSubTab}
                                institutionalData={institutionalData}
                                loadingChips={loadingChips}
                                period={activePeriod}
                            />
                        ) : activeTab === 'financials' ? (
                            <FinancialStatementsView
                                stock={stock}
                                subTab={activeSubTab}
                                subSubTab={activeSubSubTab}
                                financials={financials}
                                loading={loading}
                                epsData={epsData}
                            />
                        ) : activeTab === 'news_events' ? (
                            <div className="h-full min-h-[600px] flex flex-col">
                                <StockNewsEventsView stock={stock} />
                            </div>
                        ) : activeTab === 'technical' ? (
                            <div className="h-full w-full min-h-[600px] flex flex-col gap-6 animate-in fade-in duration-300">
                                {/* Technical Sub-Indicator Selector Bar */}
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar self-start">
                                    {[
                                        { id: 'kline', label: '主圖 K 線與型態' },
                                        { id: 'kd', label: 'KD 線圖' },
                                        { id: 'macd', label: 'MACD 指標' },
                                        { id: 'rsi', label: 'RSI 分析' },
                                        { id: 'dmi', label: 'DMI/ADX' }
                                    ].map(ind => (
                                        <button
                                            key={ind.id}
                                            onClick={() => setActiveIndicator(ind.id)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeIndicator === ind.id
                                                ? 'bg-brand-primary text-white shadow-sm'
                                                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {ind.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Render StockChart (Always active to detect patterns) */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                                    <StockChart
                                        stock={stock}
                                        period={activePeriod}
                                        onPatternsDetected={setActivePatterns}
                                        onIndicatorStatus={setIndicatorStatus}
                                    />
                                </div>

                                {/* Render active technical sub-indicator chart */}
                                {activeIndicator !== 'kline' && (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                                        {activeIndicator === 'kd' && <KDView symbol={stock.symbol} period={activePeriod} />}
                                        {activeIndicator === 'macd' && <MACDView symbol={stock.symbol} period={activePeriod} />}
                                        {activeIndicator === 'rsi' && <RSIView symbol={stock.symbol} period={activePeriod} />}
                                        {activeIndicator === 'dmi' && <DMIView symbol={stock.symbol} period={activePeriod} />}
                                    </div>
                                )}

                                {/* Classic Patterns Replica */}
                                <div className="space-y-4 mt-2">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-bold italic border border-slate-700">K</div>
                                        <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">經典型態即時比對</h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {CLASSIC_PATTERNS.filter(p => {
                                            if (activeFilter === 'bullish') return activePatterns.some(ap => ap.name === p.name && ap.type === 'bullish');
                                            if (activeFilter === 'bearish') return activePatterns.some(ap => ap.name === p.name && ap.type === 'bearish');
                                            return true;
                                        }).map(pat => {
                                            const isDetected = activePatterns.some(p => p.name === pat.name);
                                            const colorTheme = pat.type === 'bullish' ? {
                                                border: 'border-red-500 ring-1 ring-red-500/20',
                                                text: 'text-red-500',
                                                bg: 'bg-red-500'
                                            } : pat.type === 'bearish' ? {
                                                border: 'border-green-600 ring-1 ring-green-600/20',
                                                text: 'text-green-600',
                                                bg: 'bg-green-600'
                                            } : { // neutral
                                                border: 'border-blue-500 ring-1 ring-blue-500/20',
                                                text: 'text-blue-500',
                                                bg: 'bg-blue-500'
                                            };

                                            return (
                                                <div key={pat.id} className={`bg-white dark:bg-slate-850 border rounded-2xl p-5 transition-all relative overflow-hidden group shadow-sm ${isDetected ? colorTheme.border : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className={`font-black text-base leading-tight transition-colors ${isDetected ? colorTheme.text : 'text-slate-800 dark:text-white'}`}>
                                                                {pat.name}
                                                            </h3>
                                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{pat.en}</p>
                                                        </div>
                                                        {isDetected ? (
                                                            <div className={`flex items-center gap-1.5 text-[9px] font-black text-white ${colorTheme.bg} px-2 py-0.5 rounded-full shadow-sm animate-pulse`}>
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>ACTIVE</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-300 dark:text-slate-600">
                                                                <Circle className="w-3 h-3" />
                                                                <span>INACTIVE</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{pat.desc}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                                    <BarChart3 className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-black text-slate-600 mb-2 tracking-tighter">{SIDEBAR_MENU.find(m => m.id === activeTab)?.label}</h3>
                                <p className="text-xs font-bold tracking-widest uppercase text-slate-400">此功能模組建置中 / Under Construction</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
