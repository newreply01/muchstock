import React from 'react';
import { Bell, BellRing, Settings2, Plus, ArrowRight } from 'lucide-react';

export default function AlertsView({ stock }) {
    const activeAlerts = [
        { id: 1, type: 'Price', condition: 'Price >', value: (parseFloat(stock.close_price) * 1.05).toFixed(1), active: true },
        { id: 2, type: 'Volume', condition: 'Vol > 5D Avg x', value: '1.5', active: false },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BellRing className="w-6 h-6 text-amber-500" />
                        智能價量警示系統
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Smart Notification Engine</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black shadow-lg shadow-red-200 hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4" /> 新增自訂警示
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 mb-6 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-slate-400" />
                        當前生效中的警示
                    </h4>
                    <div className="space-y-4">
                        {activeAlerts.map(alert => (
                            <div key={alert.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-brand-primary/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${alert.active ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{alert.type} Alert</p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{alert.condition} {alert.value}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${alert.active ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white dark:bg-slate-900 rounded-full transition-all ${alert.active ? 'left-6' : 'left-1'}`}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">AI Recommendation</p>
                            <h4 className="text-xl font-black mb-4 leading-tight">為您推薦：<br />動能起漲警示組合</h4>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                                系統檢測到 {stock.name} 波動度正在收斂，建議設定「突破布林上軌」與「帶量紅K」組合警示，以免錯過起漲點。
                            </p>
                            <button className="flex items-center gap-2 text-xs font-black text-amber-400 group-hover:translate-x-1 transition-transform">
                                一鍵套用推薦組合 <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 border-dashed p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                <p className="text-sm font-black text-slate-600">想接收手機 Push 通知嗎？</p>
                <p className="text-xs text-slate-400 font-medium mt-1">請前往 [個人設定] 綁定 LINE Notify 或 Telegram Bot，即可在第一時間獲得警示通知。</p>
            </div>
        </div>
    );
}
