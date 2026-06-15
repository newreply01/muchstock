import React, { useState, useEffect } from 'react';
import { Activity, ArrowUp, ArrowDown, BarChart2, Clock } from 'lucide-react';
import { getRealtimeData } from '../../utils/api';

export default function RealtimeView({ stock }) {
    const [realtimeData, setRealtimeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        let intervalId;

        const fetchData = async () => {
            if (!stock?.symbol) return;
            try {
                if (!realtimeData) setLoading(true);
                const data = await getRealtimeData(stock.symbol);
                if (isMounted) {
                    if (data && data.success) {
                        setRealtimeData(data);
                        setError(null);
                    } else if (data && !data.success && data.message) {
                        setError(data.message);
                    }
                }
            } catch (err) {
                if (isMounted) setError('獲取即時行情發生錯誤，請稍後再試。');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        // 每 5 秒更新一次
        intervalId = setInterval(fetchData, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [stock?.symbol]);

    // Format data or fallback
    const displayData = realtimeData?.data || {};
    const bidAskData = displayData.five_levels || [
        { bid: null, bVol: null, ask: null, aVol: null },
        { bid: null, bVol: null, ask: null, aVol: null },
        { bid: null, bVol: null, ask: null, aVol: null },
        { bid: null, bVol: null, ask: null, aVol: null },
        { bid: null, bVol: null, ask: null, aVol: null },
    ];

    const currentPrice = displayData.price || displayData.previous_close || parseFloat(stock.close_price) || '--';
    const change = displayData.change_percent !== undefined ? displayData.change_percent : (parseFloat(stock.change_percent) || 0);
    const isUp = change >= 0;

    console.log('RealtimeView: Rendering with data', { symbol: stock.symbol, hasData: !!realtimeData, displayData });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {error && !realtimeData && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center justify-between">
                    <span>{error} (無法取得即時資料，目前可能為非交易時段或 API 存取受限)</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Five Levels (Bid/Ask) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-brand-primary" />
                            最佳五檔報價
                        </h3>
                        <div className="flex items-center gap-2">
                            {loading && !realtimeData && <span className="text-[10px] text-slate-400 animate-pulse">載入中...</span>}
                            <span className="relative flex h-2 w-2">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${loading ? 'bg-amber-400 animate-ping' : 'bg-green-400 animate-ping'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                            </span>
                            <span className={`text-[10px] font-black tracking-widest ${loading ? 'text-amber-600' : 'text-green-600'}`}>
                                {loading ? 'SYNCING' : 'LIVE'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2 relative">
                        <div className="grid grid-cols-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-50">
                            <div>買量</div>
                            <div>買價</div>
                            <div className="text-right">賣價</div>
                            <div className="text-right">賣量</div>
                        </div>

                        {bidAskData.map((row, i) => (
                            <div key={i} className="grid grid-cols-4 py-2 hover:bg-slate-50 dark:bg-slate-800 transition-colors rounded-lg px-1">
                                <div className="text-sm font-bold text-slate-500">{row.bVol !== null ? row.bVol : '--'}</div>
                                <div className="text-sm font-black text-red-500">{row.bid !== null ? row.bid.toFixed(2) : '--'}</div>
                                <div className="text-sm font-black text-green-600 text-right">{row.ask !== null ? row.ask.toFixed(2) : '--'}</div>
                                <div className="text-sm font-bold text-slate-500 text-right">{row.aVol !== null ? row.aVol : '--'}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Real-time Stats */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                        {/* Subtle highlight effect */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>

                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Summary</span>
                            {displayData.time_str && (
                                <span className="ml-auto text-[10px] font-mono font-bold text-brand-primary px-2 py-0.5 bg-brand-primary/10 rounded border border-brand-primary/20">{displayData.time_str}</span>
                            )}
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className={`text-4xl font-black ${isUp ? 'text-red-600' : 'text-green-600'} transition-colors duration-300`}>
                                    {!isNaN(parseFloat(currentPrice)) ? parseFloat(currentPrice).toFixed(2) : '--'}
                                </p>
                                <p className="text-xs font-bold text-slate-500 mt-1">成交價 (Last Sale)</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-xl font-black ${isUp ? 'text-red-600' : 'text-green-600'} flex items-center justify-end gap-1`}>
                                    {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                    {!isNaN(parseFloat(change)) ? Math.abs(parseFloat(change)).toFixed(2) : '--'}%
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">本日漲跌幅</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-blue-500" />
                            本日量能分配推估
                        </h4>
                        <div className="space-y-4">
                            <div className="space-y-1.5 flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] font-black text-slate-500 transition-all">
                                    <span>內盤 (Sell Intensity)</span>
                                    <span>{displayData.sell_intensity || 50}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${displayData.sell_intensity || 50}%` }}></div>
                                </div>
                            </div>
                            <div className="space-y-1.5 flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] font-black text-slate-500 transition-all">
                                    <span>外盤 (Buy Intensity)</span>
                                    <span>{displayData.buy_intensity || 50}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${displayData.buy_intensity || 50}%` }}></div>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                <span>累積總量: <strong className="text-slate-600 font-bold">{displayData.volume !== undefined ? displayData.volume : '--'}</strong> 張</span>
                                <span>單盤量: <strong className="text-brand-primary font-bold">{displayData.trade_volume !== undefined ? displayData.trade_volume : '--'}</strong> 張</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <Activity className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-black text-blue-800">實時數據連線中</p>
                    <p className="text-xs text-blue-600/80 font-medium leading-relaxed mt-1">
                        系統正透過證交所 MIS 系統以 5 秒輪詢頻率獲取最新盤中資料。如為非交易時段，將顯示當日最終收盤五檔資訊。該資料僅供參考。
                    </p>
                </div>
            </div>
        </div>
    );
}
