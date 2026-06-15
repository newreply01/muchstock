import React, { useState, useEffect } from 'react';
import { Search, Flame, TrendingUp } from 'lucide-react';
import { getRealtimeTicks, getRealtimeActive, getMarketIndex } from '../../utils/api';
import MarketIndexCard from '../shared/MarketIndexCard';
import StockSearchAutocomplete from '../forms/StockSearchAutocomplete';

const RealtimeExplorer = ({ onStockSelect }) => {
    const [symbol, setSymbol] = useState('2330');
    const [stockName, setStockName] = useState('');
    const [industry, setIndustry] = useState('');
    const [date, setDate] = useState('');
    const [data, setData] = useState([]); // This remains 'data' for the main table
    const [activeTicks, setActiveTicks] = useState([]); 
    const [marketIndex, setMarketIndex] = useState(null); 
    const [indexLoading, setIndexLoading] = useState(true); 
    const [loading, setLoading] = useState(true); 
    const [currentDate, setCurrentDate] = useState(null);
    const [activeSymbols, setActiveSymbols] = useState([]);

    const loadActiveSymbols = async () => {
        try {
            const res = await getRealtimeActive();
            if (res.success && res.data) {
                setActiveSymbols(res.data);
            }
        } catch (e) { console.error('Failed to load active symbols', e); }
    };

    const fetchActive = async () => {
        try {
            const res = await getRealtimeActive();
            if (res.success) setActiveTicks(res.data);
        } catch (err) {
            console.error('Failed to fetch active ticks:', err);
        }
    };

    const fetchIndex = async () => {
        try {
            const res = await getMarketIndex();
            if (res.success) {
                setMarketIndex(res.data);
            }
        } catch (err) {
            console.warn('Failed to fetch market index:', err.message);
        } finally {
            setIndexLoading(false);
        }
    };

    const fetchData = async (sym = symbol, dt = date) => {
        if (!sym) return;
        setLoading(true);
        try {
            const res = await getRealtimeTicks(sym, dt);
            if (res.success) {
                setData(res.data || []);
                setCurrentDate(res.date);
                setStockName(res.name || '');
                setIndustry(res.industry || '');
                if (!dt && res.date) setDate(res.date);

                if (!res.data || res.data.length === 0) {
                    loadActiveSymbols();
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchActive();
        fetchIndex();

        const dataInterval = setInterval(fetchData, 30000);
        const activeInterval = setInterval(fetchActive, 15000);
        const indexInterval = setInterval(fetchIndex, 10000);

        return () => {
            clearInterval(dataInterval);
            clearInterval(activeInterval);
            clearInterval(indexInterval);
        };
    }, [symbol, date]);

    const formatPrice = (p) => p ? parseFloat(p).toFixed(2) : '-.--';

    const getRowColor = (tick) => {
        const basePrice = tick.previous_close;
        if (!tick.price || !basePrice) return 'text-slate-700';
        if (tick.price > basePrice) return 'text-red-600 bg-red-50/30';
        if (tick.price < basePrice) return 'text-green-600 bg-green-50/30';
        return 'text-yellow-600 bg-yellow-50/30';
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-[calc(100vh-80px)]">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        🕰️ 盤中分時資料查詢 (1 分K)
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        {stockName && (
                            <span className="text-sm font-black text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded border border-brand-primary/10">
                                {stockName} ({symbol})
                            </span>
                        )}
                        {industry && (
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                                {industry}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            fetchData(symbol, e.target.value);
                        }}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary/20 bg-white dark:bg-slate-900 shadow-sm"
                    />
                    <div className="w-48">
                        <StockSearchAutocomplete
                            onSelectStock={(stock) => {
                                setSymbol(stock.symbol);
                                fetchData(stock.symbol, date);
                            }}
                        />
                    </div>
                    <button
                        onClick={() => fetchData(symbol, date)}
                        className="bg-brand-primary hover:bg-brand-dark text-white rounded-xl px-4 py-2 text-sm font-black transition-all shadow-sm active:scale-95 flex items-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        刷新
                    </button>
                </div>
            </div>

            {/* Market Index Bar */}
            <div className="mb-4">
                <MarketIndexCard data={marketIndex} loading={indexLoading} layout="horizontal" />
            </div>

            {/* Content Body */}
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="font-black text-slate-700 text-lg uppercase tracking-tight">
                    {symbol}成交明細
                </span>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-tighter">
                    資料日期: {currentDate || date || 'N/A'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner scroll-smooth custom-scrollbar">
                <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0 shadow-sm z-10">
                        <tr className="divide-x divide-slate-100">
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800 w-24">時間</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">價格</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">昨收</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">漲跌</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">幅度</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">開盤</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">最高</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">最低</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">累計張</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">分盤張</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">內盤%</th>
                            <th className="py-2 px-2 font-black border-b border-slate-200 dark:border-slate-800">外盤%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading && data.length === 0 ? (
                            <tr>
                                <td colSpan="12" className="py-24 text-slate-400 text-center font-black animate-pulse">正在讀取高頻交易快照...</td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan="12" className="py-24 bg-white dark:bg-slate-900 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-500">
                                        <Search className="w-12 h-12 text-slate-200 mb-4" />
                                        <p className="font-black text-base mb-1">({symbol}) 無分時資料</p>
                                        <p className="text-xs">請檢查該標的是否有交易，或切換日期重新查詢</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            [...data].sort((a, b) => b.time_str.localeCompare(a.time_str)).map((tick, i) => {
                                const basePrice = tick.previous_close;
                                const diff = tick.price && basePrice ? tick.price - basePrice : null;
                                const diffPct = diff !== null && basePrice ? (diff / basePrice) * 100 : null;
                                const diffColor = diff > 0 ? 'text-red-500 font-black' : (diff < 0 ? 'text-green-600 font-black' : 'text-slate-500');
                                const diffSign = diff > 0 ? '▲' : (diff < 0 ? '▼' : '');

                                return (
                                    <tr key={i} className={`hover:bg-slate-50 dark:bg-slate-800 transition-colors border-l-4 ${diff > 0 ? 'border-l-red-500' : (diff < 0 ? 'border-l-green-500' : 'border-l-transparent')} ${getRowColor(tick)}`}>
                                        <td className="py-1 px-2 font-mono text-slate-400">{tick.time_str}</td>
                                        <td className="py-1 px-2 font-black text-slate-800 dark:text-slate-100">{formatPrice(tick.price)}</td>
                                        <td className="py-1 px-2 text-slate-400">{formatPrice(tick.previous_close)}</td>
                                        <td className={`py-1 px-2 ${diffColor}`}>
                                            {diff !== null ? `${diffSign}${Math.abs(diff).toFixed(2)}` : '--'}
                                        </td>
                                        <td className={`py-1 px-2 ${diffColor}`}>
                                            {diffPct !== null ? `${diffPct.toFixed(2)}%` : '--'}
                                        </td>
                                        <td className="py-1 px-2 text-slate-600">{formatPrice(tick.open_price)}</td>
                                        <td className="py-1 px-2 text-red-500 font-black">{formatPrice(tick.high_price)}</td>
                                        <td className="py-1 px-2 text-green-600 font-black">{formatPrice(tick.low_price)}</td>
                                        <td className="py-1 px-2 font-black text-blue-600">{tick.volume}</td>
                                        <td className="py-1 px-2 font-black text-amber-600 bg-amber-50/50">{tick.trade_volume}</td>
                                        <td className="py-1 px-2 text-green-600">{tick.sell_intensity}%</td>
                                        <td className="py-1 px-2 text-red-500">{tick.buy_intensity}%</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    <span>共載入 {data.length} 筆筆資料</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">刷新頻率: 30S</span>
                </div>
                <span>* 點擊標題可重新排序</span>
            </div>
        </div>
    );
};

export default RealtimeExplorer;
