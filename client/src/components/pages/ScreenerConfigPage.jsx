import React, { useState, useEffect, useRef, useMemo } from 'react'
import { BarChart3, ClipboardList, Building2, Calendar, Search, RotateCcw, LayoutGrid, CheckSquare, ArrowLeft, Save, Trash2, Star } from 'lucide-react';
import { getSavedFilters, saveFilter, deleteFilter } from '../../utils/api';
import TechnicalFilters from '../forms/TechnicalFilters'
import FundamentalFilters from '../forms/FundamentalFilters'
import InstitutionalFilters from '../forms/InstitutionalFilters'
import ResultTable from '../forms/ResultTable'
import { useAuth } from '../../context/AuthContext';
import useGlobalStore from '../../store/useGlobalStore';
import GlobalFilterBar from '../forms/GlobalFilterBar';

const TABS = [
    { id: 'strategies', label: '智慧策略', icon: Star },
    { id: 'patterns', label: 'K線型態', icon: CheckSquare },
    { id: 'technical', label: '技術指標', icon: BarChart3 },
    { id: 'fundamental', label: '基本財報', icon: ClipboardList },
    { id: 'institutional', label: '法人籌碼', icon: Building2 },
];

const CLASSIC_PATTERNS = [
    { id: 'red_three_soldiers', name: '紅三兵', type: 'bullish', desc: '連三根紅棒且收盤價創新高，預示多頭強力續漲。' },
    { id: 'three_black_crows', name: '三隻烏鴉', type: 'bearish', desc: '連三根黑棒且收盤價創新低，預示空頭強力續跌。' },
    { id: 'morning_star', name: '晨星', type: 'bullish', desc: '底部的反轉訊號，由長黑、小K、長紅組成。' },
    { id: 'evening_star', name: '夜星', type: 'bearish', desc: '高檔的反轉訊號，由長紅、小K、長黑組成。' },
    { id: 'bullish_engulfing', name: '吞噬型態', type: 'bullish', desc: '紅棒完全覆蓋前一根黑棒，強烈的買進訊號。' },
    { id: 'bearish_engulfing', name: '空頭吞噬', type: 'bearish', desc: '黑棒完全覆蓋前一根紅棒，強烈的起跌訊號。' },
    { id: 'piercing_line', name: '貫穿線', type: 'bullish', desc: '長紅棒超越前一根黑棒中心，多頭反攻訊號。' },
    { id: 'hammer', name: '鎚子線', type: 'bullish', desc: '底部帶長下影線的小K線，顯示支撐強勁。' },
    { id: 'inverted_hammer', name: '倒鎚子', type: 'bullish', desc: '底部帶長上影線的小K線，預示低檔反彈。' },
    { id: 'hanging_man', name: '上吊線', type: 'bearish', desc: '高檔出現在長下影線小K線，預示賣壓沉重。' },
    { id: 'shooting_star', name: '射擊之星', type: 'bearish', desc: '高價位出現長上影線小K線，反轉看跌訊號。' },
    { id: 'three_inside_up', name: '三內升', type: 'bullish', desc: '母子線後接紅棒確認，穩健的反轉看漲。' },
    { id: 'three_inside_down', name: '三內降', type: 'bearish', desc: '母子線後接黑棒確認，穩健的反轉看跌。' },
];

export default function ScreenerConfigPage({
    onFilter,
    onClear,
    filters,
    onBack,
    results,
    loading,
    sortBy,
    sortDir,
    onSort,
    page,
    onPageChange,
    onStockClick,
    watchedSymbols,
    onToggleWatchlist
}) {
    const { requireLogin } = useAuth();
    const { globalMarket, globalStockTypes } = useGlobalStore();
    const marketForApi = globalMarket === 'all' ? undefined : globalMarket;
    const stockTypesForApi = globalStockTypes.join(',');

    const [activeTab, setActiveTab] = useState('strategies')
    const [localFilters, setLocalFilters] = useState({
        strategy: '',
        price_min: '', price_max: '',
        change_min: '', change_max: '',
        volume_min: '', volume_max: '',
        pe_min: '', pe_max: '',
        yield_min: '', yield_max: '',
        pb_min: '', pb_max: '',
        foreign_net_min: '', foreign_net_max: '',
        trust_net_min: '', trust_net_max: '',
        dealer_net_min: '', dealer_net_max: '',
        total_net_min: '', total_net_max: '',
        rsi_min: '', rsi_max: '',
        macd_hist_min: '', macd_hist_max: '',
        ma20_min: '', ma20_max: '',
        adx_min: '', adx_max: '',
        bb_width_min: '', bb_width_max: '',
        wpr_min: '', wpr_max: '',
        ...filters
    })

    const [savedFilters, setSavedFilters] = useState([])
    const [isSaving, setIsSaving] = useState(false)
    const [newFilterName, setNewFilterName] = useState('')

    const lastFiltersRef = useRef(JSON.stringify({ strategy: '' }))

    const getCleanedFilters = (filters) => {
        const cleaned = {}
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== '' && v !== null && v !== undefined && v !== 'all') {
                if (Array.isArray(v) && v.length === 0) return;
                cleaned[k] = v
            }
        })
        return cleaned;
    }

    useEffect(() => {
        fetchSavedFilters()
    }, [])

    // 優化：只在 localFilters 有「實質」變化時才觸發 onFilter
    useEffect(() => {
        const handler = setTimeout(() => {
            const cleaned = getCleanedFilters(localFilters);
            const combinedFilters = {
                ...cleaned,
                market: marketForApi,
                stock_types: stockTypesForApi
            };

            const currentString = JSON.stringify(combinedFilters);

            // 只有當新生成的過濾條件與上一次不同時，才通知父組件
            if (currentString !== lastFiltersRef.current) {
                lastFiltersRef.current = currentString;
                console.log('ScreenerConfig: Submitting changes', combinedFilters);
                onFilter(combinedFilters)
            }
        }, 800);

        return () => clearTimeout(handler);
    }, [localFilters, marketForApi, stockTypesForApi, onFilter]);

    const fetchSavedFilters = async () => {
        try {
            const res = await getSavedFilters()
            if (res.success) setSavedFilters(res.data)
        } catch (err) {
            console.error('Fetch filters failed', err)
        }
    }

    const handleSaveStrategy = async () => {
        if (!requireLogin()) return;
        if (!newFilterName.trim()) {
            alert('請輸入策略名稱')
            return
        }
        try {
            const res = await saveFilter(newFilterName, localFilters)
            if (res.success) {
                setNewFilterName('')
                setIsSaving(false)
                fetchSavedFilters()
            }
        } catch (err) {
            console.error('Save failed', err)
            alert('儲存失敗')
        }
    }

    const handleDeleteFilter = async (e, id) => {
        e.stopPropagation()
        if (!confirm('確定要刪除此策略嗎？')) return
        try {
            const res = await deleteFilter(id)
            if (res.success) fetchSavedFilters()
        } catch (err) {
            console.error('Delete failed', err)
        }
    }

    const handleLoadFilter = (filter) => {
        setLocalFilters({
            ...localFilters,
            ...filter.filters
        })
    }

    const updateFilter = (key, value) => {
        setLocalFilters(prev => {
            // 如果更新的是普通過濾條件，則清除智慧策略模式
            const next = { ...prev, [key]: value };
            if (key !== 'strategy' && key !== 'date') {
                next.strategy = '';
            }
            return next;
        })
    }

    const handleStrategySelect = (stratId) => {
        setLocalFilters(prev => {
            const isSelected = prev.strategy === stratId;
            const nextStrategy = isSelected ? '' : stratId;

            // 智慧策略為獨立模式，選擇時清除所有其他手動過濾條件
            const empty = { strategy: nextStrategy, date: prev.date };
            Object.keys(prev).forEach(k => {
                if (!['strategy', 'date'].includes(k)) {
                    empty[k] = '';
                }
            });

            // 立即通知父組件，不用等待 debounce
            const cleaned = getCleanedFilters(empty);
            onFilter(cleaned);
            lastFiltersRef.current = JSON.stringify(cleaned);

            return empty;
        });
    }

    const handleSubmit = () => {
        const cleaned = getCleanedFilters(localFilters);
        const combinedFilters = {
            ...cleaned,
            market: marketForApi,
            stock_types: stockTypesForApi
        };
        onFilter(combinedFilters);
    }

    const handleClear = () => {
        const empty = { strategy: '' }
        Object.keys(localFilters).forEach(k => {
            if (k !== 'strategy') empty[k] = ''
        })
        setLocalFilters(empty)
        onClear()
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden min-h-[800px] flex flex-col w-full">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 dark:border-slate-800 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-100 hover:bg-gray-100 transition-colors shadow-sm"
                        title="返回儀表板"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center border border-brand-primary/20">
                            <LayoutGrid className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-gray-50 tracking-tight">智能選股</h1>
                            <p className="text-sm font-medium text-gray-500 mt-0.5">組合多項條件找出潛力飆股</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        重置條件
                    </button>
                    <button
                        onClick={() => {
                            if (requireLogin()) setIsSaving(!isSaving);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold transition-all
                            ${isSaving ? 'bg-amber-50 border-amber-500 text-amber-600' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? '取消儲存' : '儲存策略'}
                    </button>
                    <button
                        className="bg-brand-primary hover:bg-red-600 text-white px-8 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-black text-sm uppercase tracking-widest shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        onClick={handleSubmit}
                    >
                        <Search className="w-4 h-4" />
                        套用篩選
                    </button>
                </div>
            </div>

            {/* Save Form overlay */}
            {isSaving && (
                <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-4 flex-1 max-w-2xl">
                        <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                            <Save className="w-4 h-4 text-white" />
                        </div>
                        <input
                            type="text"
                            placeholder="請輸入此篩選策略的名稱 (例如: 低PE高殖利率起漲股)"
                            className="flex-1 bg-white dark:bg-slate-900 border border-amber-200 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            value={newFilterName}
                            onChange={(e) => setNewFilterName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={handleSaveStrategy}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-black text-sm transition-all shadow-sm"
                    >
                        確認儲存
                    </button>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Vertical Tabs Sidebar */}
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 dark:border-slate-800 flex sm:flex-col overflow-x-auto sm:overflow-visible">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                className={`flex items-center gap-3 py-4 px-6 transition-all text-left whitespace-nowrap
                                    ${isActive
                                        ? 'bg-white dark:bg-slate-900 text-brand-primary border-t-2 md:border-t-0 md:border-l-4 border-brand-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] sm:shadow-none'
                                        : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900 dark:text-gray-50 border-t-2 md:border-t-0 md:border-l-4 border-transparent'}
                                `}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-primary' : 'text-gray-400'}`} />
                                <span className="font-bold tracking-wide">{tab.label}</span>
                            </button>
                        )
                    })}

                    <div className="mt-auto border-t border-gray-200 dark:border-slate-800 p-4 hidden md:block">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                            <Star className="w-3 h-3" />
                            我的儲存策略
                            <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[9px]">{savedFilters.length}</span>
                        </h3>
                        <div className="space-y-1">
                            {savedFilters.length === 0 ? (
                                <p className="text-[10px] text-gray-400 px-2 italic">尚未儲存任何策略</p>
                            ) : (
                                savedFilters.map(sf => (
                                    <div
                                        key={sf.id}
                                        className="group flex items-center justify-between p-2 rounded-lg hover:bg-brand-primary/5 cursor-pointer text-gray-600 hover:text-brand-primary transition-all"
                                        onClick={() => handleLoadFilter(sf)}
                                    >
                                        <span className="text-xs font-bold truncate flex-1">{sf.name}</span>
                                        <button
                                            onClick={(e) => handleDeleteFilter(e, sf.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-500 transition-all"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-slate-900 space-y-8">
                    {/* Global Filter Bar aligned with Date Picker */}
                    <div className="flex flex-col xl:flex-row gap-6 pb-8 border-b border-gray-100 xl:items-center">
                        <div className="flex-1 overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white dark:bg-slate-900">
                            <GlobalFilterBar />
                        </div>

                        {/* Date Picker (Specific to Screener) */}
                        <div className="space-y-3 shrink-0">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                目標資料日期
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="w-[200px] bg-white dark:bg-slate-900 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary shadow-sm transition-all hover:border-gray-400"
                                    value={localFilters.date || ''}
                                    onChange={e => updateFilter('date', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tab Panels */}
                    <div className="min-h-[400px]">
                        {activeTab === 'strategies' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-gray-50 mb-1">精選策略 (Yahoo 經典款)</h3>
                                    <p className="text-gray-500 text-sm mb-6">快速選用常見的熱門投資策略，尋找符合目標條件的股票。</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { id: 'bullish_ma', name: '多頭排列', desc: '短中長期均線依序排列向上，且股價在均線之上', color: 'bg-red-50 text-red-700 border-red-200 hover:border-red-400' },
                                            { id: 'breakout', name: '突破均線', desc: '今日收盤價向上突破 20 日均線 (月線) 的發動訊號', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400' },
                                            { id: 'high_yield', name: '高殖利率', desc: '現金股利殖利率大於 5%，長線穩定存股首選', color: 'bg-green-50 text-green-700 border-green-200 hover:border-green-400' },
                                            { id: 'value_invest', name: '價值投資', desc: '低本益比 (PE < 15) 且 低淨值比 (PB < 1)', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400' },
                                            { id: 'inst_buy', name: '法人連買', desc: '外資與投信呈現同步淨買超的資金匯聚股', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400' },
                                        ].map(strat => {
                                            const isSelected = localFilters.strategy === strat.id;
                                            return (
                                                <button
                                                    key={strat.id}
                                                    onClick={() => handleStrategySelect(strat.id)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                                        ${isSelected ? `${strat.color.split(' ')[0]} border-brand-primary shadow-sm` : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'}
                                                    `}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className={`font-black text-[16px] ${isSelected ? 'text-brand-primary' : 'text-gray-900 dark:text-gray-50'}`}>{strat.name}</h4>
                                                        <div className={`w-5 h-5 rounded-full border ${isSelected ? 'bg-brand-primary border-brand-primary flex items-center justify-center' : 'bg-white dark:bg-slate-900 border-gray-300'}`}>
                                                            {isSelected && <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full"></div>}
                                                        </div>
                                                    </div>
                                                    <p className="text-[12px] text-gray-500 leading-snug">{strat.desc}</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-gray-50 mb-1">大師策略</h3>
                                    <p className="text-gray-500 text-sm mb-6">跟隨全球頂尖投資大師的選股邏輯，發掘潛力黑馬與穩健好股。</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { id: 'kenneth_fisher', name: '肯尼斯費雪', desc: '利用營收獲利成長，找出超級強勢股', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400' },
                                            { id: 'michael_price', name: '麥克喜偉', desc: '尋找連續三年高成長行業，且具高投資報酬率', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400' },
                                            { id: 'warren_buffett', name: '華倫巴菲特', desc: '價值投資大師，尋找股東權益報酬率與毛利高標的', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400' },
                                            { id: 'benjamin_graham', name: '班哲明格拉罕', desc: '防禦型投資，高流動比與低負債比，兼顧獲利', color: 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400' },
                                            { id: 'peter_lynch', name: '彼得林區', desc: '尋找具備成長潛力的隱形冠軍，連續淨利成長', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:border-cyan-400' },
                                            { id: 'michael_murphy', name: '麥克墨菲', desc: '高科技與高成長，營收與淨利雙成長，重視營業利益率', color: 'bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-400' },
                                            { id: 'safe_dividend', name: '安心存股', desc: '長線穩定發放股利，防禦力強的存股標的', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400' },
                                            { id: 'financial_giant', name: '財務大腕', desc: '營收創新高且毛利明顯提升的成長股，且股價便宜', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 border-slate-200 dark:border-slate-800 hover:border-slate-400' },
                                            { id: 'lynn_lin_20w_breakout', name: '林恩如 20周突破', desc: '股價由下往上突破 20 週均線，強勢起漲訊號', color: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 hover:border-brand-primary' },
                                        ].map(strat => {
                                            const isSelected = localFilters.strategy === strat.id;
                                            return (
                                                <button
                                                    key={strat.id}
                                                    onClick={() => handleStrategySelect(strat.id)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                                        ${isSelected ? `${strat.color.split(' ')[0]} border-brand-primary shadow-sm` : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'}
                                                    `}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className={`font-black text-[16px] ${isSelected ? 'text-brand-primary' : 'text-gray-900 dark:text-gray-50'}`}>{strat.name}</h4>
                                                        <div className={`w-5 h-5 rounded-full border ${isSelected ? 'bg-brand-primary border-brand-primary flex items-center justify-center' : 'bg-white dark:bg-slate-900 border-gray-300'}`}>
                                                            {isSelected && <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full"></div>}
                                                        </div>
                                                    </div>
                                                    <p className="text-[12px] text-gray-500 leading-snug">{strat.desc}</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'technical' && <div className="animate-in fade-in duration-300"><TechnicalFilters filters={localFilters} onChange={updateFilter} /></div>}
                        {activeTab === 'fundamental' && <div className="animate-in fade-in duration-300"><FundamentalFilters filters={localFilters} onChange={updateFilter} /></div>}
                        {activeTab === 'institutional' && <div className="animate-in fade-in duration-300"><InstitutionalFilters filters={localFilters} onChange={updateFilter} /></div>}
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-primary text-white rounded-lg flex items-center justify-center font-black italic">R</div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-gray-50 tracking-tight">篩選結果</h2>
                        {results?.latestDate && (
                            <span className="ml-2 text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                資料日期：{results.latestDate}
                            </span>
                        )}
                    </div>
                    <div className="h-px flex-1 bg-gray-200 ml-6 hidden md:block"></div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                    <ResultTable
                        results={results}
                        loading={loading}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                        page={page}
                        onPageChange={onPageChange}
                        onStockClick={onStockClick}
                        watchedSymbols={watchedSymbols}
                        onToggleWatchlist={onToggleWatchlist}
                    />
                </div>
            </div>
        </div>
    )
}
