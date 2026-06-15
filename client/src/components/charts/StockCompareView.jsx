import React, { useState, useEffect, useCallback } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { GitCompare, Search, X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../../utils/api';

const COMPARE_COLORS = ['#7c3aed', '#ef4444', '#10b981', '#f59e0b'];

function formatNum(v, decimals = 2) {
    if (v === null || v === undefined || isNaN(v)) return '--';
    return Number(v).toFixed(decimals);
}

function getWinner(stocks, key, higherIsBetter = true) {
    let best = null;
    let bestVal = higherIsBetter ? -Infinity : Infinity;
    stocks.forEach(s => {
        const v = parseFloat(s[key]);
        if (isNaN(v)) return;
        if (higherIsBetter ? v > bestVal : v < bestVal) { bestVal = v; best = s.symbol; }
    });
    return best;
}

const METRICS = [
    { key: 'closePrice', label: '股價', unit: '元', decimals: 2, higherIsBetter: null },
    { key: 'changePercent', label: '漲跌幅', unit: '%', decimals: 2, higherIsBetter: true },
    { key: 'pe', label: '本益比 (PE)', unit: '倍', decimals: 2, higherIsBetter: false },
    { key: 'pb', label: '淨值比 (PB)', unit: '倍', decimals: 2, higherIsBetter: false },
    { key: 'dividendYield', label: '殖利率', unit: '%', decimals: 2, higherIsBetter: true },
    { key: 'roe', label: 'ROE', unit: '%', decimals: 1, higherIsBetter: true },
    { key: 'roa', label: 'ROA', unit: '%', decimals: 1, higherIsBetter: true },
    { key: 'grossMargin', label: '毛利率', unit: '%', decimals: 1, higherIsBetter: true },
    { key: 'operatingMargin', label: '營業利益率', unit: '%', decimals: 1, higherIsBetter: true },
    { key: 'netMargin', label: '淨利率', unit: '%', decimals: 1, higherIsBetter: true },
    { key: 'revenueGrowth', label: '營收年增率', unit: '%', decimals: 1, higherIsBetter: true },
    { key: 'avgCashDividend', label: '平均現金股利', unit: '元', decimals: 2, higherIsBetter: true },
    { key: 'instNetBuy5d', label: '近5日法人買超', unit: '張', decimals: 0, higherIsBetter: true }
];

export default function StockCompareView({ initialSymbols = [] }) {
    const [symbols, setSymbols] = useState(initialSymbols.length > 0 ? initialSymbols : ['2330', '2303']);
    const [inputValue, setInputValue] = useState('');
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);

    const fetchCompare = useCallback(async () => {
        if (symbols.length < 2) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/stocks/compare?symbols=${symbols.join(',')}`);
            const data = await res.json();
            if (data.success) setStocks(data.data);
            else setError(data.message);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [symbols]);

    useEffect(() => { fetchCompare(); }, [fetchCompare]);

    const handleSearch = async (q) => {
        setInputValue(q);
        if (q.length < 1) { setSearchResults([]); return; }
        try {
            const res = await fetch(`${API_BASE}/stocks/search?q=${q}&limit=5`);
            const data = await res.json();
            setSearchResults(data || []);
        } catch (e) { setSearchResults([]); }
    };

    const addSymbol = (symbol) => {
        if (symbols.length >= 4) return;
        if (symbols.includes(symbol)) return;
        setSymbols([...symbols, symbol]);
        setInputValue('');
        setSearchResults([]);
        setShowSearch(false);
    };

    const removeSymbol = (symbol) => {
        setSymbols(symbols.filter(s => s !== symbol));
    };

    // Radar data for comparison
    const radarData = stocks.length > 0 ? [
        { dim: 'ROE', ...Object.fromEntries(stocks.map(s => [s.symbol, Math.min(s.roe || 0, 100)])) },
        { dim: '毛利率', ...Object.fromEntries(stocks.map(s => [s.symbol, Math.min(s.grossMargin || 0, 100)])) },
        { dim: '殖利率', ...Object.fromEntries(stocks.map(s => [s.symbol, Math.min((s.dividendYield || 0) * 10, 100)])) },
        { dim: '營收成長', ...Object.fromEntries(stocks.map(s => [s.symbol, Math.min(Math.max((s.revenueGrowth || 0) + 50, 0), 100)])) },
        { dim: '法人買超', ...Object.fromEntries(stocks.map(s => [s.symbol, Math.min(Math.max((s.instNetBuy5d || 0) / 100 + 50, 0), 100)])) },
        { dim: '價值(低PE)', ...Object.fromEntries(stocks.map(s => [s.symbol, Math.min(Math.max(100 - (s.pe || 50), 0), 100)])) }
    ] : [];

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                <p className="font-bold tracking-widest text-sm uppercase">讀取比較資料...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-orange-100 p-2.5 rounded-xl border border-orange-200">
                    <GitCompare className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">個股 PK 比較</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Stock Comparison (Max 4)</p>
                </div>
            </div>

            {/* Stock Selector */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {symbols.map((sym, idx) => {
                        const stock = stocks.find(s => s.symbol === sym);
                        return (
                            <div key={sym} className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 font-bold text-sm" style={{ borderColor: COMPARE_COLORS[idx], color: COMPARE_COLORS[idx] }}>
                                <span className="text-xs font-mono">{sym}</span>
                                {stock?.name && stock.name !== sym && (
                                    <span className="opacity-80">{stock.name}</span>
                                )}
                                {symbols.length > 2 && (
                                    <button onClick={() => removeSymbol(sym)} className="ml-1 hover:opacity-70">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {symbols.length < 4 && (
                        <div className="relative">
                            <button onClick={() => setShowSearch(!showSearch)} className="px-3 py-1.5 rounded-full border-2 border-dashed border-slate-300 text-slate-400 text-sm font-bold hover:border-slate-400 hover:text-slate-600 transition-colors">
                                + 加入比較
                            </button>
                            {showSearch && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={e => handleSearch(e.target.value)}
                                        placeholder="輸入股票代碼或名稱..."
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                                        autoFocus
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="mt-1 max-h-48 overflow-y-auto">
                                            {searchResults.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    onClick={() => addSymbol(s.symbol)}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:bg-slate-800 rounded-lg text-sm flex justify-between items-center"
                                                >
                                                    <span className="font-bold text-slate-800 dark:text-slate-100">{s.name}</span>
                                                    <span className="text-xs text-slate-400">{s.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                </div>
            )}

            {stocks.length >= 2 && (
                <>
                    {/* Radar Overlap Chart */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-4 text-sm">雷達重疊比較</h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                                    {stocks.map((s, idx) => (
                                        <Radar
                                            key={s.symbol}
                                            name={`${s.name} (${s.symbol})`}
                                            dataKey={s.symbol}
                                            stroke={COMPARE_COLORS[idx]}
                                            fill={COMPARE_COLORS[idx]}
                                            fillOpacity={0.1}
                                            strokeWidth={2}
                                        />
                                    ))}
                                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontWeight: 'bold' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                                        <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[120px]">指標</th>
                                        {stocks.map((s, idx) => (
                                            <th key={s.symbol} className="text-center px-4 py-3 min-w-[140px]">
                                                <div className="font-black text-sm" style={{ color: COMPARE_COLORS[idx] }}>{s.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{s.symbol} · {s.market === 'twse' ? '上市' : '上櫃'}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {METRICS.map((metric, mIdx) => {
                                        const winner = metric.higherIsBetter !== null ? getWinner(stocks, metric.key, metric.higherIsBetter) : null;
                                        return (
                                            <tr key={metric.key} className={mIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50'}>
                                                <td className={`px-4 py-3 font-bold text-slate-700 text-xs sticky left-0 z-10 ${mIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                                    {metric.label}
                                                </td>
                                                {stocks.map((s, idx) => {
                                                    const val = s[metric.key];
                                                    const isWinner = winner === s.symbol;
                                                    const isNeg = metric.key === 'changePercent' && parseFloat(val) < 0;
                                                    return (
                                                        <td key={s.symbol} className={`text-center px-4 py-3 tabular-nums font-bold ${isWinner ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100'}`}>
                                                            <span className={`${isWinner ? 'bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200' : ''} ${isNeg ? 'text-green-600' : (metric.key === 'changePercent' && parseFloat(val) > 0) ? 'text-red-500' : ''}`}>
                                                                {formatNum(val, metric.decimals)}{metric.unit}
                                                            </span>
                                                            {isWinner && <span className="ml-1 text-[10px]">👑</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed font-medium">
                註：個股 PK 最多同時比較 4 檔股票。「👑」標示表示該指標在所有比較股票中表現最佳（PE、PB 越低越好；ROE、殖利率、營收成長等越高越好）。所有資訊僅供參考。
            </div>
        </div>
    );
}
