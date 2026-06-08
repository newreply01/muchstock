import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, TrendingUp, TrendingDown, Shield, Target, Coins, Users, Award, BarChart3, PieChart, Activity, Layout, Zap, AlertCircle, Brain, Info } from 'lucide-react';
import { API_BASE } from '../../utils/api';
import useGlobalStore from '../../store/useGlobalStore';
import GlobalFilterBar from '../forms/GlobalFilterBar';
import StockSearchAutocomplete from '../forms/StockSearchAutocomplete';
import StockCompareView from '../charts/StockCompareView';
import HealthBacktestDashboard from '../charts/HealthBacktestDashboard';

const GRADE_STYLES = {
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', badge: 'bg-emerald-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', badge: 'bg-blue-500' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', badge: 'bg-amber-500' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', badge: 'bg-red-500' }
};

function ScoreBar({ score, size = 'sm' }) {
    const color = score >= 75 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 45 ? '#f59e0b' : '#ef4444';
    const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
    return (
        <div className={`w-full bg-slate-100 rounded-full ${h}`}>
            <div className={`${h} rounded-full transition-all duration-700`} style={{ width: `${score}%`, backgroundColor: color }}></div>
        </div>
    );
}

function getScoreColor(score) {
    if (score >= 75) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 45) return '#f59e0b';
    return '#ef4444';
}

const SORT_OPTIONS = [
    { value: 'overall_score', label: '綜合分數' },
    { value: 'profit_score', label: '獲利能力 (20%)' },
    { value: 'growth_score', label: '成長能力 (15%)' },
    { value: 'safety_score', label: '安全性 (7%)' },
    { value: 'value_score', label: '價值衡量 (15%)' },
    { value: 'dividend_score', label: '配息能力 (10%)' },
    { value: 'chip_score', label: '籌碼面 (13%)' },
    { value: 'news_score', label: '消息面 (20%)' },
    { value: 'pe', label: '本益比' },
    { value: 'dividend_yield', label: '殖利率' },
    { value: 'revenue_growth', label: '營收年增率' }
];

const GRADE_OPTIONS = [
    { value: '', label: '全部等級' },
    { value: '優秀', label: '🏆 優秀 (≥75)' },
    { value: '良好', label: '⭐ 良好 (60-74)' },
    { value: '普通', label: '📊 普通 (45-59)' },
    { value: '待改善', label: '⚠️ 待改善 (<45)' }
];

const SMART_RATING_OPTIONS = [
    { value: '', label: '全部建議' },
    { value: '強力推薦', label: '💎 強力推薦' },
    { value: '推薦', label: '🚀 推薦' },
    { value: '偏多操作', label: '📈 偏多操作' },
    { value: '中立', label: '⚖️ 中立' },
    { value: '偏空觀察', label: '🔍 偏空觀察' },
    { value: '減碼', label: '📉 減碼' },
    { value: '大幅減碼', label: '🛑 大幅減碼' }
];

const SMART_RATING_STYLES = {
    "強力推薦": "bg-emerald-600",
    "推薦": "bg-green-500",
    "偏多操作": "bg-teal-400",
    "中立": "bg-slate-400",
    "偏空觀察": "bg-amber-400",
    "減碼": "bg-orange-500",
    "大幅減碼": "bg-red-500"
};

export default function HealthCheckRanking({ onSelectStock }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [sort, setSort] = useState('overall_score');
    const [order, setOrder] = useState('DESC');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const { globalMarket, globalStockTypes, globalIndustry: globalIndustry, setGlobalIndustry: setGlobalIndustry } = useGlobalStore();
    const marketForApi = globalMarket === 'all' ? undefined : globalMarket;
    const stockTypesForApi = globalStockTypes.join(',');
    const [grade, setGrade] = useState('');
    const [smartRating, setSmartRating] = useState('');
    const [industries, setIndustries] = useState([]);
    const [calcDate, setCalcDate] = useState(null);
    const [smartRatingCounts, setSmartRatingCounts] = useState({});
    const [gradeCounts, setGradeCounts] = useState({});

    // Tab & Stock Management
    const [activeTab, setActiveTab] = useState('ranking'); // ranking, health, analyzer, ai_report, valuation, pk, trend, chart
    const [selectedStock, setSelectedStock] = useState({ symbol: '2330', name: '台積電', industry: '半導體業', market: '上市' });

    const TABS = [
        { id: 'ranking', label: '健診排行', icon: Award },
        { id: 'backtest', label: '回測監控', icon: Target },
        { id: 'pk', label: '個股 PK', icon: Users }
    ];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                sort, order, page, limit,
                ...(search && { search }),
                ...(globalIndustry && globalIndustry !== 'all' && { industry: globalIndustry }),
                ...(marketForApi && { market: marketForApi }),
                ...(stockTypesForApi && { stock_types: stockTypesForApi }),
                ...(grade && { grade }),
                ...(smartRating && { smart_rating: smartRating })
            });
            const res = await fetch(`${API_BASE}/health-check-ranking?${params}`);
            const json = await res.json();
            if (json.success) {
                setData(json.data || []);
                setTotal(json.total || 0);
                setIndustries(json.industries || []);
                setCalcDate(json.calcDate);
                if (json.smartRatingCounts) {
                    setSmartRatingCounts(json.smartRatingCounts);
                }
                if (json.gradeCounts) {
                    setGradeCounts(json.gradeCounts);
                }
            }
        } catch (e) {
            console.error('Health ranking error:', e);
        } finally {
            setLoading(false);
        }
    }, [sort, order, page, limit, search, globalIndustry, marketForApi, stockTypesForApi, grade, smartRating]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleSort = (col) => {
        if (sort === col) setOrder(o => o === 'DESC' ? 'ASC' : 'DESC');
        else { setSort(col); setOrder('DESC'); }
        setPage(1);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-0 min-h-screen bg-slate-50/50 pb-20">
            <GlobalFilterBar />

            {/* Sub Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 pt-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto flex flex-wrap gap-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-sm font-black transition-all relative ${activeTab === tab.id
                                ? 'text-teal-600 bg-teal-50/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'}`} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 max-w-[1400px] mx-auto space-y-6">
                {/* Search Bar for Analysis Tabs */}
                {activeTab !== 'ranking' && activeTab !== 'analyzer' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-teal-50 p-3 rounded-2xl">
                                <Search className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-brand-primary tracking-tight">
                                    {selectedStock ? `${selectedStock.name} (${selectedStock.symbol})` : '切換分析標的'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {selectedStock ? `目前分析標的：${selectedStock.industry || '未指定行業'}` : '請搜尋或從排行中選擇股票進行分析'}
                                </p>
                            </div>
                        </div>
                        <div className="w-full sm:w-96">
                            <StockSearchAutocomplete onSelectStock={(s) => setSelectedStock(s)} />
                        </div>
                    </div>
                )}

                {activeTab === 'ranking' ? (
                    <>
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-2">
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-2xl shadow-lg shadow-teal-200/50">
                        <Heart className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">個股健診排行</h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Stock Health Check Ranking · {total} 檔個股
                            {calcDate && <span className="ml-2">· 更新日期: {new Date(calcDate).toLocaleDateString('zh-TW')}</span>}
                        </p>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="space-y-1">
                    {/* Total Count Badge */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 px-4 py-2 rounded-xl">
                            <Filter className="w-4 h-4 text-violet-600" />
                            <span className="text-xs font-bold text-violet-500 uppercase tracking-wider">篩選結果</span>
                            <span className="text-lg font-black text-violet-600 tabular-nums ml-1">{total}</span>
                            <span className="text-xs font-bold text-violet-400">檔</span>
                        </div>
                        {(grade || smartRating) && (
                            <button 
                                onClick={() => { setGrade(''); setSmartRating(''); setPage(1); }}
                                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors underline underline-offset-2"
                            >
                                清除篩選
                            </button>
                        )}
                    </div>

                    {/* Grade Filter Group */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Award className="w-4 h-4 text-slate-500" />
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">等級表現 Overall Grade</h3>
                            <span className="text-[10px] text-slate-400 font-medium ml-1">— 基本面七維度綜合評分</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: '優秀', value: gradeCounts['優秀'] || 0, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', active: grade === '優秀', logic: '綜合分數 ≥ 65 分（前 ~10%）', onClick: () => { setGrade(grade === '優秀' ? '' : '優秀'); setPage(1); } },
                        { label: '良好', value: gradeCounts['良好'] || 0, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', active: grade === '良好', logic: '綜合分數 50 ~ 64 分', onClick: () => { setGrade(grade === '良好' ? '' : '良好'); setPage(1); } },
                        { label: '普通', value: gradeCounts['普通'] || 0, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50', active: grade === '普通', logic: '綜合分數 35 ~ 49 分', onClick: () => { setGrade(grade === '普通' ? '' : '普通'); setPage(1); } },
                        { label: '待改善', value: gradeCounts['待改善'] || 0, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', active: grade === '待改善', logic: '綜合分數低於 35 分（後 ~6%）', onClick: () => { setGrade(grade === '待改善' ? '' : '待改善'); setPage(1); } }
                    ].map((stat, i) => (
                        <div 
                            key={i} 
                            onClick={stat.onClick}
                            className={`${stat.bg} p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm group relative ${stat.active ? 'border-current ring-2 ring-offset-1 ring-slate-100' : 'border-slate-200 hover:border-slate-300'}`}
                            style={stat.active ? { borderColor: 'currentColor' } : {}}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <div className="relative group/info">
                                    <Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 transition-colors" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible lg:group-hover:opacity-100 lg:group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                                        <div className="font-bold mb-1 border-b border-white/20 pb-1">{stat.label} 條件說明</div>
                                        {stat.logic}
                                    </div>
                                </div>
                            </div>
                            <div className={`text-2xl font-black ${stat.color} tabular-nums`}>{stat.value}</div>
                        </div>
                    ))}
                </div>
                    </div>

                    {/* Smart Rating Filter Group */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-slate-500" />
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">智慧評級 Smart Rating</h3>
                            <span className="text-[10px] text-slate-400 font-medium ml-1">— 技術面 + 價格位階 + 市場情緒</span>
                        </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        { label: '強力推薦', value: smartRatingCounts['強力推薦'] || 0, icon: Zap, color: 'text-emerald-700', bg: 'bg-emerald-50', active: smartRating === '強力推薦', logic: '7 項訊號中淨多頭 ≥ 5，技術面與基本面全面看好，強烈建議布局。', onClick: () => { setSmartRating(smartRating === '強力推薦' ? '' : '強力推薦'); setPage(1); } },
                        { label: '推薦', value: smartRatingCounts['推薦'] || 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', active: smartRating === '推薦', logic: '7 項訊號中淨多頭 3～4，多面向均偏多，整體面向上看好。', onClick: () => { setSmartRating(smartRating === '推薦' ? '' : '推薦'); setPage(1); } },
                        { label: '偏多操作', value: smartRatingCounts['偏多操作'] || 0, icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-50', active: smartRating === '偏多操作', logic: '7 項訊號中淨多頭 1～2，方向偏多但力道不足，可輕倉布局。', onClick: () => { setSmartRating(smartRating === '偏多操作' ? '' : '偏多操作'); setPage(1); } },
                        { label: '中立', value: smartRatingCounts['中立'] || 0, icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50', active: smartRating === '中立', logic: '7 項訊號多空平衡（淨訊號 = 0），方向不明朗，建議觀望。', onClick: () => { setSmartRating(smartRating === '中立' ? '' : '中立'); setPage(1); } },
                        { label: '偏空觀察', value: smartRatingCounts['偏空觀察'] || 0, icon: Search, color: 'text-amber-600', bg: 'bg-amber-50', active: smartRating === '偏空觀察', logic: '7 項訊號中淨空頭 1～2，方向偏弱，建議縮減風險敞口。', onClick: () => { setSmartRating(smartRating === '偏空觀察' ? '' : '偏空觀察'); setPage(1); } },
                        { label: '減碼', value: smartRatingCounts['減碼'] || 0, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50', active: smartRating === '減碼', logic: '7 項訊號中淨空頭 3～4，整體面偏弱，建議減少持倉以控制風險。', onClick: () => { setSmartRating(smartRating === '減碼' ? '' : '減碼'); setPage(1); } },
                        { label: '大幅減碼', value: smartRatingCounts['大幅減碼'] || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', active: smartRating === '大幅減碼', logic: '7 項訊號中淨空頭 ≥ 5，技術面與基本面全面偏弱，建議出場觀察。', onClick: () => { setSmartRating(smartRating === '大幅減碼' ? '' : '大幅減碼'); setPage(1); } }
                    ].map((stat, i) => (
                        <div 
                            key={i} 
                            onClick={stat.onClick}
                            className={`${stat.bg} p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm group relative ${stat.active ? 'border-current ring-2 ring-offset-1 ring-slate-100' : 'border-slate-200 hover:border-slate-300'}`}
                            style={stat.active ? { borderColor: 'currentColor' } : {}}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                </div>
                                <div className="relative group/info">
                                    <Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 transition-colors" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible lg:group-hover:opacity-100 lg:group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                                        <div className="font-bold mb-1 border-b border-white/20 pb-1">{stat.label} 條件說明</div>
                                        <p>{stat.logic}</p>
                                    </div>
                                </div>
                            </div>
                            <div className={`text-2xl font-black ${stat.color} tabular-nums`}>{stat.value}</div>
                        </div>
                    ))}
                </div>
                    </div>
                </div>

                {/* Search + Sort + Industry Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="搜尋股票代號或名稱..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400"
                            />
                        </div>
                        <button type="submit" className="px-4 py-2 bg-teal-500 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition-colors">搜尋</button>
                        {search && (
                            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="text-xs text-slate-400 hover:text-rose-500 underline">清除</button>
                        )}
                    </form>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-slate-400" />
                        <select
                            value={sort}
                            onChange={(e) => { setSort(e.target.value); setPage(1); }}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-300"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setOrder(o => o === 'DESC' ? 'ASC' : 'DESC')}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            {order === 'DESC' ? '↓ 高→低' : '↑ 低→高'}
                        </button>
                    </div>

                    {/* Industry Filter */}
                    {industries.length > 0 && (
                        <select
                            value={globalIndustry || 'all'}
                            onChange={(e) => { setGlobalIndustry(e.target.value === 'all' ? '' : e.target.value); setPage(1); }}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-300 max-w-[180px]"
                        >
                            <option value="all">全部產業</option>
                            {industries.map(ind => (
                                <option key={ind} value={ind}>{ind}</option>
                            ))}
                        </select>
                    )}

                    {/* Limit selector */}
                    <select
                        value={limit}
                        onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    >
                        <option value={50}>50 筆</option>
                        <option value={100}>100 筆</option>
                        <option value={200}>200 筆</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase">
                                    <th className="px-4 py-3 text-left w-12 sticky left-0 bg-slate-50 z-10">#</th>
                                    <th className="px-4 py-3 text-left sticky left-12 bg-slate-50 z-10">股票</th>
                                    <th className="px-3 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('overall_score')}>
                                        綜合{sort === 'overall_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('smart_score')}>
                                        操作建議{sort === 'smart_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center">等級</th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('profit_score')}>
                                        獲利{sort === 'profit_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('growth_score')}>
                                        成長{sort === 'growth_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('safety_score')}>
                                        安全{sort === 'safety_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('value_score')}>
                                        價值{sort === 'value_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('dividend_score')}>
                                        配息{sort === 'dividend_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('chip_score')}>
                                        籌碼{sort === 'chip_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-2 py-3 text-center cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('news_score')}>
                                        消息{sort === 'news_score' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-3 py-3 text-right cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('close_price')}>
                                        股價{sort === 'close_price' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                    <th className="px-3 py-3 text-right cursor-pointer hover:text-teal-600 transition-colors" onClick={() => toggleSort('change_percent')}>
                                        漲跌%{sort === 'change_percent' && <span className="ml-0.5">{order === 'DESC' ? '↓' : '↑'}</span>}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((stock, idx) => {
                                    const rank = (page - 1) * limit + idx + 1;
                                    const gradeStyle = GRADE_STYLES[stock.grade_color] || GRADE_STYLES.yellow;
                                    return (
                                        <tr 
                                            key={stock.symbol} 
                                            className="border-b border-slate-100 hover:bg-teal-50/50 cursor-pointer transition-colors"
                                            onClick={() => {
                                                window.dispatchEvent(new CustomEvent('muchstock-select', { detail: { symbol: stock.symbol, name: stock.name, industry: stock.industry, market: stock.market } }));
                                            }}
                                        >
                                            <td className="px-4 py-3 text-slate-400 font-bold sticky left-0 bg-white z-10">{rank}</td>
                                            <td className="px-4 py-3 sticky left-12 bg-white z-10">
                                                <div className="font-bold text-slate-800">{stock.name}</div>
                                                <div className="text-[10px] text-slate-400">{stock.symbol}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="font-black" style={{ color: getScoreColor(stock.overall_score) }}>{stock.overall_score}</span>
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${SMART_RATING_STYLES[stock.smart_rating] || 'bg-slate-400'}`}>
                                                    {stock.smart_rating}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${gradeStyle.badge}`}>
                                                    {stock.grade}
                                                </span>
                                            </td>
                                            {[stock.profit_score, stock.growth_score, stock.safety_score, stock.value_score, stock.dividend_score, stock.chip_score, stock.news_score].map((s, i) => (
                                                <td key={i} className="px-2 py-3 text-center font-bold" style={{ color: getScoreColor(s) }}>{s}</td>
                                            ))}
                                            <td className="px-3 py-3 text-right font-bold text-slate-700">{stock.close_price}</td>
                                            <td className={`px-3 py-3 text-right font-bold ${parseFloat(stock.change_percent) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                {stock.change_percent}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
                        <div className="text-sm text-slate-500 font-medium">
                            顯示第 <span className="font-bold text-slate-700">{(page - 1) * limit + 1}</span> - <span className="font-bold text-slate-700">{Math.min(page * limit, total)}</span> 筆，共 <span className="font-bold text-slate-700">{total}</span> 筆
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page <= 1}
                                className="px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                首頁
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            {/* Page numbers */}
                            {(() => {
                                const pages = [];
                                let start = Math.max(1, page - 2);
                                let end = Math.min(totalPages, page + 2);
                                if (end - start < 4) {
                                    if (start === 1) end = Math.min(totalPages, start + 4);
                                    else start = Math.max(1, end - 4);
                                }
                                for (let i = start; i <= end; i++) pages.push(i);
                                return pages.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-10 h-10 text-sm font-bold rounded-xl transition-colors ${p === page
                                            ? 'bg-teal-500 text-white shadow-lg shadow-teal-200/50'
                                            : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ));
                            })()}

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page >= totalPages}
                                className="px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                末頁
                            </button>
                        </div>
                    </div>
                )}
                    </>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[700px]">
                        {!selectedStock && activeTab === 'pk' ? (
                            <div className="h-[600px] flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                                <Search className="w-12 h-12 text-teal-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-700">尚未選擇分析標的</h3>
                                <p className="text-sm mt-2">請從排行中點擊股票加入 PK</p>
                            </div>
                        ) : activeTab === 'backtest' ? (
                            <div className="p-0"><HealthBacktestDashboard /></div>
                        ) : activeTab === 'pk' ? (
                            <div className="p-0"><StockCompareView initialSymbols={selectedStock ? [selectedStock.symbol] : []} /></div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
