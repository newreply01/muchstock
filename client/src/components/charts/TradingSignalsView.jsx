import React from 'react';
import { Target, ShieldAlert, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function TradingSignalsView({ stock }) {
    const signals = [
        { type: 'buy', label: '黃金交叉 (MA)', desc: '5日線向上突破20日線，短線轉強。', strength: 'Strong', time: '2024-05-20' },
        { type: 'buy', label: '量能增溫', desc: '本日成交量突破 5 日均量 1.5 倍。', strength: 'Medium', time: '2024-05-23' },
        { type: 'warning', label: '超買警戒', desc: 'RSI 指標進入 75 高檔區，注意拉回。', strength: 'Caution', time: 'Latest' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                        <Zap className="p-1 bg-amber-100 text-amber-500 rounded-lg w-7 h-7" />
                        智能買賣訊號追蹤
                    </h3>

                    {signals.map((sig, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start gap-4 hover:border-brand-primary transition-all shadow-sm">
                            <div className={`mt-1 p-2 rounded-xl flex-shrink-0 ${sig.type === 'buy' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                                {sig.type === 'buy' ? <Target className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-slate-800 dark:text-slate-100">{sig.label}</h4>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${sig.type === 'buy' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {sig.strength}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{sig.desc}</p>
                                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{sig.time}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                        <h4 className="font-black text-slate-800 dark:text-slate-100 mb-6 text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                            操作策略總結
                        </h4>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">建議買點 (Entry)</p>
                                <p className="text-sm font-bold text-slate-700">突破 {(parseFloat(stock.close_price) * 1.02).toFixed(1)} 元分水嶺後進場</p>
                            </div>
                            <div className="h-px bg-slate-200"></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">停損守備 (Stop Loss)</p>
                                <p className="text-sm font-bold text-slate-700">跌破 {(parseFloat(stock.close_price) * 0.95).toFixed(1)} 元 (前波低點)</p>
                            </div>
                            <div className="h-px bg-slate-200"></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">預期目標 (Target)</p>
                                <p className="text-sm font-bold text-red-500">{(parseFloat(stock.close_price) * 1.15).toFixed(1)} 元 (+15%)</p>
                            </div>
                        </div>
                    </div>

                    <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                        開啟進階警示設定 <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/5 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                    * 買賣訊號基於技術面量價與 AI 權重計算，不包含基本面突發消息影響。投資有風險，請確認後操作。
                </p>
            </div>
        </div>
    );
}
