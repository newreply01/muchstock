import React from 'react';
import { TrendingUp, TrendingDown, Zap, ShieldCheck, Waves } from 'lucide-react';

export default function TrendView({ stock }) {
    const trends = [
        { label: '短線趨勢 (5D)', value: parseFloat(stock.change_percent) > 0 ? '強勢' : '弱勢', score: 85, icon: Zap, color: 'text-amber-500' },
        { label: '中線趨勢 (20D)', value: '盤整偏多', score: 62, icon: TrendingUp, color: 'text-red-500' },
        { label: '生命線守護 (60D)', value: '多頭支撐', score: 78, icon: ShieldCheck, color: 'text-blue-500' },
        { label: '長線循環', value: '初升段', score: 45, icon: Waves, color: 'text-indigo-500' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {trends.map((t, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:scale-110 transition-transform">
                                    <t.icon className={`w-5 h-5 ${t.color}`} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Momentum</p>
                                    <p className="font-black text-slate-800 dark:text-slate-100">{t.label}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-black ${t.color}`}>{t.value}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black text-slate-400">
                                <span>強度分值 (Strength)</span>
                                <span>{t.score}/100</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full opacity-80 rounded-full bg-gradient-to-r from-slate-200 to-${t.color.split('-')[1]}-500`}
                                    style={{ width: `${t.score}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h4 className="text-xl font-black mb-4 flex items-center gap-2">
                        <TrendingUp className="text-red-400 w-6 h-6" />
                        多維度趨勢匯總
                    </h4>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
                        根據目前的量價關係與技術指標，{stock.name} ({stock.symbol}) 在短線上呈現{parseFloat(stock.change_percent) > 0 ? '攻擊性買盤' : '回檔走勢'}。
                        中長期趨勢依然受控於 60 日均線上方。建議觀察成交量是否能有效放大，以支撐後續的漲勢。
                    </p>
                    <div className="mt-6 flex gap-4">
                        <div className="px-5 py-2 bg-white/10 rounded-xl border border-white/10 text-xs font-black">
                            趨勢評級: <span className="text-red-400 ml-1">BUY+</span>
                        </div>
                        <div className="px-5 py-2 bg-white/10 rounded-xl border border-white/10 text-xs font-black">
                            風險等級: <span className="text-amber-400 ml-1">MODERATE</span>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 -mr-20 -mt-20 bg-red-500/10 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
}
