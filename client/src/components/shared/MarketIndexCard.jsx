import React from 'react';
import { Activity, ArrowUp, ArrowDown, TrendingUp, Clock } from 'lucide-react';

export default function MarketIndexCard({ data, loading, dark = false, layout = 'card' }) {
    if (loading) {
        return (
            <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white dark:bg-slate-900 border-gray-100'} rounded-xl shadow-sm border p-4 animate-pulse ${layout === 'horizontal' ? 'h-14 py-2' : ''}`}>
                 {layout === 'horizontal' ? (
                     <div className="flex items-center gap-4 h-full">
                         <div className={`h-4 w-24 ${dark ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                         <div className={`h-6 w-32 ${dark ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                     </div>
                 ) : (
                    <>
                        <div className={`h-4 w-24 ${dark ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-3`}></div>
                        <div className={`h-8 w-32 ${dark ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
                    </>
                 )}
            </div>
        );
    }

    if (!data && !loading) {
        return (
            <div className={`${dark ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-400'} rounded-xl shadow-sm border border-dashed p-4 flex items-center justify-center text-xs font-medium ${layout === 'horizontal' ? 'h-14 py-2' : 'h-[100px]'}`}>
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 opacity-20" />
                    <span>大盤數據讀取中...</span>
                </div>
            </div>
        );
    }

    // Default empty object to prevent destructuring errors
    const marketData = data || { price: 0, previous_close: 0, time_str: '--:--:--', high_price: 0, low_price: 0 };
    
    // Convert string to numbers safely
    const price = parseFloat(marketData.price || 0);
    const previous_close = parseFloat(marketData.previous_close || 0);
    const high_price = parseFloat(marketData.high_price || 0);
    const low_price = parseFloat(marketData.low_price || 0);
    const { time_str } = marketData;

    const change = price - previous_close;
    const changePercent = previous_close !== 0 ? (change / previous_close) * 100 : 0;
    const isUp = change >= 0;
    
    // Taiwan market: Up is red, Down is green
    const colorClass = isUp ? (dark ? 'text-red-400' : 'text-rose-600') : (dark ? 'text-green-400' : 'text-emerald-600');
    const bgClass = isUp ? (dark ? 'bg-red-900/20' : 'bg-rose-50') : (dark ? 'bg-green-900/20' : 'bg-emerald-50');
    const Icon = isUp ? ArrowUp : ArrowDown;

    if (layout === 'horizontal') {
        return (
            <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} rounded-xl shadow-sm border h-14 px-4 flex items-center justify-between group transition-all duration-300 w-full overflow-hidden`}>
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar whitespace-nowrap">
                    {/* Index Name & Price */}
                    <div className="flex items-center gap-3 border-r pr-6 border-slate-100 dark:border-slate-800 dark:border-gray-700">
                        <div className={`flex items-center gap-2 ${dark ? 'text-gray-400' : 'text-slate-500'} font-bold`}>
                            <Activity className={`w-4 h-4 ${dark ? 'text-red-400' : 'text-brand-primary'}`} />
                            <span className="text-sm">台股加權指數</span>
                        </div>
                        <span className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-800 dark:text-slate-100'} tracking-tight`}>
                            {price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Change Stats */}
                    <div className="flex items-center gap-4 border-r pr-6 border-slate-100 dark:border-slate-800 dark:border-gray-700">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bgClass} ${colorClass} text-sm font-bold`}>
                            <Icon className="w-4 h-4" />
                            <span>{Math.abs(change).toFixed(2)}</span>
                            <span className="text-xs opacity-80 pl-1">{Math.abs(changePercent).toFixed(2)}%</span>
                        </div>
                    </div>

                    {/* H/L Stats */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-slate-400'} font-bold uppercase`}>最高</span>
                            <span className={`text-sm font-bold ${dark ? 'text-red-400' : 'text-red-600'}`}>{high_price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-slate-400'} font-bold uppercase`}>最低</span>
                            <span className={`text-sm font-bold ${dark ? 'text-green-400' : 'text-emerald-600'}`}>{low_price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-slate-400'} font-bold uppercase`}>昨收</span>
                            <span className={`text-sm font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{previous_close.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className={`flex items-center gap-2 text-[10px] ${dark ? 'text-gray-500' : 'text-slate-400'} font-medium`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>最後更新 {time_str}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`${dark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white dark:bg-slate-900 border-gray-100 hover:shadow-md'} rounded-xl shadow-sm border overflow-hidden group transition-all duration-300`}>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className={`flex items-center gap-2 ${dark ? 'text-gray-400' : 'text-gray-500'} font-medium`}>
                        <Activity className={`w-4 h-4 ${dark ? 'text-red-400' : 'text-brand-primary'}`} />
                        <span className="text-sm">台股加權指數</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{time_str}</span>
                    </div>
                </div>

                <div className="flex items-baseline gap-3">
                    <span className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-800 dark:text-gray-100'} tracking-tight`}>
                        {price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${bgClass} ${colorClass} text-sm font-bold`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{Math.abs(change).toFixed(2)}</span>
                        <span className="text-[11px] opacity-80">({Math.abs(changePercent).toFixed(2)}%)</span>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'} uppercase`}>昨收</span>
                            <span className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{previous_close.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'} uppercase`}>最高</span>
                            <span className={`text-xs font-medium ${dark ? 'text-red-400' : 'text-red-600'}`}>{high_price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'} uppercase`}>最低</span>
                            <span className={`text-xs font-medium ${dark ? 'text-green-400' : 'text-emerald-600'}`}>{low_price.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <TrendingUp className={`w-10 h-10 opacity-10 ${colorClass}`} />
                    </div>
                </div>
            </div>
            
            <div className={`h-1 w-full ${isUp ? 'bg-red-500' : 'bg-green-500'} opacity-20`}></div>
        </div>
    );
}
