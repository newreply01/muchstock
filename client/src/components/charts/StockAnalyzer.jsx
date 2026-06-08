import React, { useState, useEffect } from 'react';
import {
    Zap, Activity, Target, Shield, Brain, TrendingUp, TrendingDown,
    ArrowRight, ChevronRight, Info, Search, Filter, AlertCircle, ChevronDown, ChevronUp, BarChart3, Waves
} from 'lucide-react';
import { getRealtimeData, getQuickDiagnosis, API_BASE } from '../../utils/api';
import useGlobalStore from '../../store/useGlobalStore';
import DiagnosisModal from '../modals/DiagnosisModal';

export default function StockAnalyzer({ symbol }) {
    const { globalMarket: market, globalIndustry: industry, globalStockTypes } = useGlobalStore();
    const stockTypesForApi = globalStockTypes.join(',');
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDiagnosis, setShowDiagnosis] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const simpleFilters = [
        { id: 'buy', label: '適合買進', desc: '站上月線 + 綜合評分 ≥ 2', icon: TrendingUp, color: 'emerald', tagColor: 'bg-emerald-500', type: '買入' },
        { id: 'sell', label: '考慮賣出', desc: '跌破月線 + 綜合評分 ≤ -2', icon: TrendingDown, color: 'rose', tagColor: 'bg-rose-500', type: '賣出' },
        { id: 'volume', label: '量能異動', desc: '今日成交量 > 5日均量 1.5 倍', icon: Zap, color: 'blue', tagColor: 'bg-blue-500', type: '篩選' },
        { id: 'oversold', label: '超跌反彈', desc: 'RSI < 30 (超賣區)', icon: Activity, color: 'indigo', tagColor: 'bg-indigo-500', type: '買入' },
        { id: 'foreign_buy', label: '外資買超', desc: '外資近期大量買入股票', icon: Brain, color: 'amber', tagColor: 'bg-amber-500', type: '篩選' },
        { id: 'foreign_sell', label: '外資賣超', desc: '外資近期大量出脫持股', icon: Shield, color: 'slate', tagColor: 'bg-slate-500', type: '賣出' },
        { id: 'trust_buy', label: '投信買超', desc: '投信近期佈局重心', icon: Target, color: 'teal', tagColor: 'bg-teal-500', type: '買入' },
        { id: 'trust_sell', label: '投信賣超', desc: '投信近期撤出重心', icon: Activity, color: 'orange', tagColor: 'bg-orange-500', type: '賣出' }
    ];

    const advancedCategories = [
        {
            name: '趨勢 (均線與布林)',
            icon: TrendingUp,
            filters: [
                { id: 'ma20_up', label: '站上 MA20', desc: '收盤價在 20 日均線上方', icon: TrendingUp, color: 'emerald', type: '買入' },
                { id: 'ma20_down', label: '跌破 MA20', desc: '收盤價在 20 日均線下方', icon: TrendingDown, color: 'rose', type: '賣出' },
                { id: 'bb_up', label: '布林突破上軌', desc: '%B > 1.0 (強勢突破)', icon: Zap, color: 'blue', type: '買入' },
                { id: 'bb_down', label: '布林跌破下軌', desc: '%B < 0.0 (空頭排列)', icon: Shield, color: 'slate', type: '賣出' }
            ]
        },
        {
            name: '動能 (KD 與 MACD)',
            icon: Activity,
            filters: [
                { id: 'kd_gold', label: 'KD 黃金交叉', desc: 'K 線由下往上穿越 D 線', icon: Zap, color: 'emerald', type: '買入' },
                { id: 'kd_death', label: 'KD 死亡交叉', desc: 'K 線由上往下穿越 D 線', icon: TrendingDown, color: 'rose', type: '賣出' },
                { id: 'macd_up', label: 'MACD 翻多', desc: 'OSC 柱狀指標值由負轉正', icon: Activity, color: 'blue', type: '買入' },
                { id: 'macd_down', label: 'MACD 翻空', desc: 'OSC 柱狀指標值由正轉負', icon: TrendingDown, color: 'orange', type: '賣出' }
            ]
        },
        {
            name: '量價 (RSI 與 IBS)',
            icon: BarChart3,
            filters: [
                { id: 'vol_spike', label: '量能放大 >1.5x', desc: '成交量超過均量 1.5 倍', icon: Zap, color: 'indigo', type: '篩選' },
                { id: 'rsi_low', label: 'RSI < 30', desc: '低位超賣區，具反彈潛力', icon: Waves, color: 'emerald', type: '買入' },
                { id: 'rsi_high', label: 'RSI > 70', desc: '高位超買區，注意過熱回檔', icon: TrendingDown, color: 'rose', type: '賣出' },
                { id: 'ibs_low', label: 'IBS ≤ 0.2', desc: '收在當日低點，反彈機率高', icon: Target, color: 'teal', type: '買入' },
                { id: 'ibs_high', label: 'IBS ≥ 0.8', desc: '收在當日高點，注意回馬槍', icon: Activity, color: 'orange', type: '賣出' }
            ]
        }
    ];

    useEffect(() => {
        const fetchFilteredStocks = async () => {
            setLoading(true);
            try {
                const params = {
                    market: market === 'all' ? undefined : market,
                    industry: industry === 'all' ? undefined : industry,
                    stock_types: stockTypesForApi,
                    limit: 30
                };

                if (selectedFilter) {
                    params.filter = selectedFilter;
                    
                    // Specific sorting for some filters if needed
                    if (['foreign_buy', 'trust_buy'].includes(selectedFilter)) {
                        params.sort = 'chip_score';
                    } else if (selectedFilter === 'sell') {
                        params.order = 'ASC';
                    }
                }

                const finalParams = { ...params, order: params.order || 'DESC' };
                const paramsStr = new URLSearchParams(
                    Object.fromEntries(Object.entries(finalParams).filter(([_, v]) => v !== undefined && v !== null))
                ).toString();

                const res = await fetch(`${API_BASE}/health-check-ranking?${paramsStr}`);
                const json = await res.json();

                if (json.success) {
                    const enriched = (json.data || []).map(s => ({
                        ...s,
                        price: s.close_price,
                        percent: s.change_percent,
                        change: s.change_value || (s.close_price * s.change_percent / 100).toFixed(2),
                        target1: (s.close_price * 1.08).toFixed(1),
                        target2: (s.close_price * 1.15).toFixed(1),
                        stopLoss: (s.close_price * 0.96).toFixed(1)
                    }));
                    setStocks(enriched);
                }
            } catch (err) {
                console.error('StockAnalyzer fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFilteredStocks();
    }, [selectedFilter, market, industry, stockTypesForApi]);

    const handleDiagnosisOpen = (stock) => {
        setSelectedStock(stock);
        setShowDiagnosis(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 bg-white p-6 rounded-[2rem] shadow-sm">
            {/* Market Mood Gauge */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-2xl">
                        <Activity className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="text-slate-900 font-black tracking-tight text-lg">市場情緒溫度計</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Market Sentiment Temperature</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">震盪整理 (Neutral)</span>
                        <div className="w-64 h-3 bg-slate-200 rounded-full overflow-hidden relative border border-slate-100">
                            <div className="absolute top-0 left-0 h-full w-[60%] bg-gradient-to-r from-emerald-500 via-orange-500 to-rose-500"></div>
                            <div className="absolute top-0 left-[60%] w-1.5 h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.1)] z-10"></div>
                        </div>
                    </div>
                    <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-orange-500 font-black text-2xl italic tracking-tighter">62</span>
                    </div>
                </div>
            </div>

            {/* Simple Filters Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500/10" />
                        <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest">簡易篩選條件</h4>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {simpleFilters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setSelectedFilter(f.id)}
                            className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden ${selectedFilter === f.id
                                    ? `border-${f.color}-500 bg-${f.color}-50 shadow-md`
                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2.5 rounded-xl bg-${f.color}-50 group-hover:scale-110 transition-transform`}>
                                    <f.icon className={`w-5 h-5 text-${f.color}-500`} />
                                </div>
                                <span className={`${selectedFilter === f.id ? 'bg-white text-slate-900' : `${f.tagColor} text-white`} text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm`}>
                                    {f.type}
                                </span>
                            </div>
                            <h4 className="text-slate-900 font-black text-sm mb-1">{f.label}</h4>
                            <p className="text-[10px] text-slate-500 font-bold leading-tight group-hover:text-slate-600 transition-colors line-clamp-2">{f.desc}</p>
                            {selectedFilter === f.id && <div className={`absolute bottom-0 left-0 h-1.5 w-full bg-${f.color}-500`} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Advanced Filters Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <Filter className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-black text-slate-600 uppercase tracking-widest">進階分析條件 (Technical Patterns)</span>
                    </div>
                    {showAdvanced ? <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />}
                </button>

                {showAdvanced && (
                    <div className="space-y-10 animate-in slide-in-from-top-4 duration-500">
                        {advancedCategories.map((cat, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <cat.icon className="w-4 h-4 text-slate-400" />
                                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{cat.name}</h5>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {cat.filters.map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => setSelectedFilter(f.id)}
                                            className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedFilter === f.id
                                                    ? `border-${f.color}-500 bg-white shadow-md`
                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <f.icon className={`w-4 h-4 ${selectedFilter === f.id ? `text-${f.color}-500` : 'text-slate-300'}`} />
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${f.type === '買入' ? 'bg-emerald-50 text-emerald-600' : f.type === '賣出' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    {f.type}
                                                </span>
                                            </div>
                                            <h6 className="text-xs font-black text-slate-800 mb-1">{f.label}</h6>
                                            <p className="text-[9px] text-slate-400 font-bold leading-tight">{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Results Table Section */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl relative">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-md shadow-indigo-200">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-black tracking-tighter text-lg">分析清單</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Screener Insights & Real-time Metrics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LIVE</span>
                        </div>
                        <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">
                            命中: {stocks.length} 標的
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar-thin">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="px-6 py-5 sticky left-0 bg-white/95 backdrop-blur-md z-10 w-48 shadow-[1px_0_0_rgb(241,245,249)]">公司/代號</th>
                                <th className="px-6 py-5">現價</th>
                                <th className="px-6 py-5">漲跌%</th>
                                <th className="px-6 py-5 text-emerald-600/80">停利目標 1</th>
                                <th className="px-6 py-5 text-emerald-500">停利目標 2</th>
                                <th className="px-6 py-5 text-rose-500">建議停損</th>
                                <th className="px-6 py-5 text-indigo-500">綜合評分</th>
                                <th className="px-6 py-5 text-right pr-10">AI 決策</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                    <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">AI 策略計算中...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : stocks.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-24 text-center text-slate-300 italic font-black uppercase tracking-widest text-xs">
                                        查無符合條件之標的
                                    </td>
                                </tr>
                            ) : stocks.map((s) => (
                                <tr key={s.symbol} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-6 sticky left-0 bg-white/95 backdrop-blur-md z-10 shadow-[1px_0_0_rgb(241,245,249)]">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-black font-mono text-lg tracking-tighter">{s.symbol}</span>
                                            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className="text-slate-800 font-black font-mono text-xl tabular-nums">{s.price}</span>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className={`flex flex-col ${s.percent > 0 ? 'text-rose-500' : (s.percent < 0 ? 'text-emerald-600' : 'text-slate-400')}`}>
                                            <span className="font-black text-lg italic tabular-nums tracking-tighter">{s.percent > 0 ? '+' : ''}{s.percent}%</span>
                                            <span className="text-[10px] font-bold opacity-80">{s.change > 0 ? '▲' : (s.change < 0 ? '▼' : '')}{Math.abs(s.change)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-emerald-600/80 font-black font-mono text-base">{s.target1}</td>
                                    <td className="px-6 py-6 text-emerald-500 font-black font-mono text-base">{s.target2}</td>
                                    <td className="px-6 py-6 text-rose-500 font-black font-mono text-base">{s.stopLoss}</td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-16 shadow-inner">
                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.overall_score}%` }}></div>
                                            </div>
                                            <span className="text-indigo-600 font-black font-mono text-sm">{s.overall_score}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-right pr-10">
                                        <button
                                            onClick={() => handleDiagnosisOpen(s)}
                                            className="bg-indigo-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest shadow-md shadow-indigo-100 transition-all active:scale-95 group-hover:scale-105"
                                        >
                                            AI 診斷分析
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedStock && (
                <DiagnosisModal
                    isOpen={showDiagnosis}
                    onClose={() => setShowDiagnosis(false)}
                    stock={selectedStock}
                />
            )}
        </div>
    );
}
