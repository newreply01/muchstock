import React, { useState, useEffect } from 'react';
import { Target, Shield, Zap, Activity, TrendingUp, TrendingDown, Info, Brain, ChevronRight } from 'lucide-react';
import { getQuickDiagnosis } from '../../utils/api';

export default function QuickDiagnosisView({ symbol }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        getQuickDiagnosis(symbol)
            .then(res => {
                if (res.success) {
                    setData(res.data);
                } else {
                    setError(res.error || '無法獲取資料');
                }
            })
            .catch(err => {
                console.error('Quick diagnosis error:', err);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [symbol]);

    if (loading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mb-4"></div>
                <p className="text-sm font-bold uppercase tracking-widest">診斷中...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Info className="w-12 h-12 text-slate-200 mb-4" />
                <p className="font-bold text-slate-600">暫無診斷資料</p>
                <p className="text-sm mt-1">{error || '系統正在計算中，請稍後再試'}</p>
            </div>
        );
    }

    const { score: health_score, support_resistance, indicators, ai_summary, latest_price, rating } = data;
    const { resistance, support } = (support_resistance || {});
    
    // Rating mapping
    const RATING_STYLES = {
        "強力買進": { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600", lightBg: "bg-emerald-50", lightText: "text-emerald-700" },
        "買進": { bg: "bg-green-500", text: "text-white", border: "border-green-600", lightBg: "bg-green-50", lightText: "text-green-700" },
        "觀望": { bg: "bg-slate-500", text: "text-white", border: "border-slate-600", lightBg: "bg-slate-50 dark:bg-slate-800", lightText: "text-slate-700" },
        "賣出": { bg: "bg-orange-500", text: "text-white", border: "border-orange-600", lightBg: "bg-orange-50", lightText: "text-orange-700" },
        "強力賣出": { bg: "bg-red-500", text: "text-white", border: "border-red-600", lightBg: "bg-red-50", lightText: "text-red-700" }
    };

    const currentRating = (rating && RATING_STYLES[rating.label]) ? RATING_STYLES[rating.label] : RATING_STYLES["觀望"];
    
    
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Row: Rating & Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rating Recommendation Card */}
                <div className={`${currentRating.lightBg} rounded-3xl p-8 flex flex-col items-center justify-center border-2 ${currentRating.border} shadow-lg relative overflow-hidden group transition-all hover:scale-[1.02]`}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl"></div>
                    <div className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-4">系統投資建議</div>
                    <div className={`text-5xl font-black ${currentRating.lightText} leading-none mb-4`}>
                        {rating?.label || "觀望"}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 rounded-full shadow-sm">
                        <TrendingUp className={`w-4 h-4 ${currentRating.lightText}`} />
                        <span className={`text-[11px] font-black ${currentRating.lightText}`}>SMART RATING</span>
                    </div>
                    {/* Tiny Score Info */}
                    <div className="mt-4 text-[9px] font-bold text-slate-400">
                        信心指數: {rating?.score ? Math.abs(rating.score * 100).toFixed(0) : '0'}%
                    </div>
                </div>

                {/* Rating Breakdown Card */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-black tracking-widest uppercase">智慧評分維度</span>
                    </div>
                    
                    <div className="space-y-5">
                        {[
                            { label: '市場情緒 (Sentiment)', value: rating?.details?.sentiment ?? 0, icon: Brain, color: 'bg-indigo-500' },
                            { label: '技術指標 (Technical)', value: rating?.details?.technical ?? 0, icon: Shield, color: 'bg-teal-500' },
                            { label: '價格位置 (Price Level)', value: rating?.details?.price_level ?? 0, icon: Target, color: 'bg-amber-500' }
                        ].map((item, idx) => {
                            // Map -1.0..1.0 to 0..100
                            const percent = ((item.value + 1) / 2) * 100;
                            return (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <item.icon className="w-3.5 h-3.5" />
                                            {item.label}
                                        </div>
                                        <span className="text-slate-400 tabular-nums">
                                            {item.value > 0 ? '+' : ''}{item.value.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* AI Summary & Technical Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* AI Summary Card */}
                <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 text-white relative flex flex-col justify-center border border-slate-800 shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Brain className="w-32 h-32" />
                    </div>
                    <div className="flex items-center gap-2 mb-4 text-brand-primary">
                        <Zap className="w-5 h-5 fill-brand-primary" />
                        <span className="text-xs font-black tracking-widest uppercase">AI 智慧投資診斷</span>
                    </div>
                    <p className="text-lg font-bold leading-relaxed relative z-10">
                        「{ai_summary}」
                    </p>
                </div>

                {/* Technical Mini Stats */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">今日技術概況</div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">RSI (14)</span>
                            <span className={`text-sm font-black tabular-nums ${indicators?.rsi > 70 ? 'text-red-500' : indicators?.rsi < 30 ? 'text-emerald-500' : 'text-slate-700'}`}>
                                {indicators?.rsi || '--'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">MACD 柱狀體</span>
                            <span className={`text-sm font-black tabular-nums ${indicators?.macd_hist > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {indicators?.macd_hist || '--'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">股價 / MA20</span>
                            <span className={`text-sm font-black ${indicators?.position_vs_ma20 === '上方' ? 'text-red-500' : 'text-emerald-500'}`}>
                                {indicators?.position_vs_ma20}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support/Resistance Visualization */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2 rounded-xl">
                            <Target className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">關鍵支撐壓力位</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support & Resistance Levels</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">當前股價</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-50 tabular-nums">{latest_price}</div>
                    </div>
                </div>

                <div className="relative pt-6 pb-2 px-4 mb-4">
                    {/* Horizontal Line Background */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 rounded-full"></div>
                    
                    <div className="flex justify-between items-center relative">
                        {/* Support */}
                        <div className="flex flex-col items-center">
                            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border-2 border-emerald-100 font-black text-lg mb-3 shadow-sm tabular-nums">
                                {support?.price || support || '--'}
                            </div>
                            <div className="h-4 w-0.5 bg-emerald-500 rounded-full mb-2"></div>
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">支撐位</div>
                            <div className="text-xs font-bold text-slate-400 tabular-nums">
                                {support_resistance?.distance_to_support ? `-${support_resistance.distance_to_support}%` : '--'}
                            </div>
                        </div>

                        {/* Current Price Marker */}
                        <div className="flex flex-col items-center z-10">
                            <div className="w-6 h-6 rounded-full bg-brand-primary border-4 border-white shadow-lg ring-4 ring-brand-primary/10 transition-all hover:scale-125"></div>
                            <div className="mt-2 text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">NOW</div>
                        </div>

                        {/* Resistance */}
                        <div className="flex flex-col items-center">
                            <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-2xl border-2 border-rose-100 font-black text-lg mb-3 shadow-sm tabular-nums">
                                {resistance?.price || resistance || '--'}
                            </div>
                            <div className="h-4 w-0.5 bg-rose-500 rounded-full mb-2"></div>
                            <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">壓力位</div>
                            <div className="text-xs font-bold text-slate-400 tabular-nums">
                                {support_resistance?.distance_to_resistance ? `+${support_resistance.distance_to_resistance}%` : '--'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 leading-tight">
                            評估結果包含技術面、支撐壓力位與 AI 情緒分析。所有資訊僅供參考，不構成任何投資建議。
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
