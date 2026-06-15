import React, { useState, useEffect } from 'react';
import { getMarketFocus } from '../../utils/api';
import { Target, AlertCircle } from 'lucide-react';

export default function MarketFocus({ market, stockTypes, onStockSelect }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getMarketFocus({
                    market,
                    stock_types: stockTypes?.join(',')
                });
                if (res.success) {
                    setData(res.data);
                }
            } catch (err) {
                console.error('Fetch market focus failed', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [market, stockTypes]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white/50 rounded-2xl border border-gray-100 animate-pulse mb-6">
                <Target className="w-8 h-8 text-brand-primary mb-2 opacity-50" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">載入市場焦點...</span>
            </div>
        );
    }

    if (!data) return null;

    const categories = [
        { key: 'turnover', title: '市場最吸金' },
        { key: 'hot', title: '當沖最熱門' },
        { key: 'foreign3d', title: '外資買三日' },
        { key: 'trust3d', title: '投信買三日' },
        { key: 'main3d', title: '主力買三日' }
    ];

    // Chart parameters
    const CH_HEIGHT = 160;
    const MAX_PCT = 10; // represent 10%

    const renderBar = (stock, idx) => {
        const change = parseFloat(stock.change_percent) || 0;
        const boundedChange = Math.max(Math.min(change, MAX_PCT), -MAX_PCT);

        const isPositive = change >= 0;
        const colorClass = isPositive ? 'bg-red-500' : 'bg-green-500';
        const heightPct = (Math.abs(boundedChange) / MAX_PCT) * 50;

        return (
            <div
                key={idx}
                className="flex flex-col items-center flex-1 min-w-0 group cursor-pointer relative"
                onClick={() => onStockSelect && onStockSelect(stock)}
            >
                {/* Tooltip */}
                <div className="absolute -top-8 w-max opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] px-2 py-1 rounded z-20 pointer-events-none shadow-md">
                    {stock.name} {change > 0 ? '+' : ''}{change.toFixed(2)}%
                </div>

                {/* Chart Area for this bar */}
                <div className="relative w-full flex justify-center z-10" style={{ height: CH_HEIGHT }}>
                    {isPositive ? (
                        <div
                            className={`absolute w-1.5 sm:w-2.5 rounded-t-sm transition-all duration-500 hover:brightness-110 ${colorClass}`}
                            style={{
                                bottom: '50%',
                                height: `${heightPct || 0.5}%`
                            }}
                        />
                    ) : (
                        <div
                            className={`absolute w-1.5 sm:w-2.5 rounded-b-sm transition-all duration-500 hover:brightness-110 ${colorClass}`}
                            style={{
                                top: '50%',
                                height: `${heightPct || 0.5}%`
                            }}
                        />
                    )}
                </div>

                {/* Stock Name */}
                <div className="mt-3 flex flex-col items-center h-28 overflow-visible">
                    <span
                        className={`text-xs font-bold text-gray-700 whitespace-nowrap group-hover:text-brand-primary ${idx === 0 ? 'bg-blue-500 text-white px-0.5 rounded-sm' : ''}`}
                        style={{ writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '1px', maxHeight: '100px', overflow: 'hidden' }}
                    >
                        {stock.name.substring(0, 5)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-500" />
                    市場焦點個股
                    <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                </h3>
            </div>

            <div className="relative w-full overflow-x-auto pb-2 scrollbar-hide">
                <div className="min-w-[700px] flex">

                    {/* Y-Axis Labels */}
                    <div className="flex flex-col text-xs font-black text-gray-400 w-8 border-r border-gray-200 dark:border-slate-800 relative shrink-0" style={{ height: CH_HEIGHT, marginTop: '32px' }}>
                        <span className="absolute right-2" style={{ top: '10%', transform: 'translateY(-50%)' }}>8%</span>
                        <span className="absolute right-2" style={{ top: '30%', transform: 'translateY(-50%)' }}>4%</span>
                        <span className="absolute right-2" style={{ top: '50%', transform: 'translateY(-50%)' }}>0%</span>
                        <span className="absolute right-2" style={{ top: '70%', transform: 'translateY(-50%)' }}>-4%</span>
                        <span className="absolute right-2" style={{ top: '90%', transform: 'translateY(-50%)' }}>-8%</span>
                    </div>

                    {/* Columns Container */}
                    <div className="flex-1 flex relative pl-4" style={{ paddingTop: '32px' }}>
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 pointer-events-none pl-4 pr-4" style={{ top: '32px', height: CH_HEIGHT }}>
                            <div className="absolute w-full border-t border-gray-100" style={{ top: '10%' }}></div>
                            <div className="absolute w-full border-t border-gray-100" style={{ top: '30%' }}></div>
                            <div className="absolute w-full border-t border-gray-300 border-dashed z-0" style={{ top: '50%' }}></div>
                            <div className="absolute w-full border-t border-gray-100" style={{ top: '70%' }}></div>
                            <div className="absolute w-full border-t border-gray-100" style={{ top: '90%' }}></div>
                        </div>

                        {/* Chart Categories */}
                        {categories.map((cat, i) => (
                            <div key={cat.key} className="flex-1 flex flex-col items-center relative z-10 px-1 border-r border-gray-50 last:border-0">
                                <div className="text-sm font-bold text-gray-400 mb-4 absolute -top-8 text-center w-full">
                                    {cat.title}
                                </div>
                                <div className="flex justify-between w-full relative">
                                    {data[cat.key]?.slice(0, 10).map((stock, idx) => renderBar(stock, idx))}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
