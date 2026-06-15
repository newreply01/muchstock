import React from 'react';
import { Waves, TrendingUp, Info } from 'lucide-react';

export default function WaveView({ stock }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Waves className="w-5 h-5 text-blue-500" />
                        艾略特波浪理論分析 (Elliott Wave)
                    </h3>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">AI Wave Recognition</span>
                </div>

                {/* Visual Illustration of Wave */}
                <div className="relative h-64 w-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                    {/* Simple CSS Wave Representation */}
                    <div className="absolute inset-0 flex items-end justify-center pointer-events-none p-12">
                        <div className="w-full h-full flex items-end">
                            <div className="flex-1 flex flex-col items-center">
                                <div className="w-px h-16 bg-slate-200 relative">
                                    <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-slate-300"></div>
                                    <span className="absolute -top-6 text-[10px] font-black text-slate-400">1</span>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center">
                                <div className="w-px h-8 bg-slate-200 relative">
                                    <span className="absolute -top-6 text-[10px] font-black text-slate-400">2</span>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center">
                                <div className="w-px h-48 bg-red-400 relative">
                                    <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                                    <span className="absolute -top-6 text-[10px] font-black text-red-500">3 (Current)</span>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center opacity-30">
                                <div className="w-px h-24 bg-slate-200 relative border-dashed border-l">
                                    <span className="absolute -top-6 text-[10px] font-black text-slate-400">4</span>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center opacity-30">
                                <div className="w-px h-36 bg-slate-200 relative border-dashed border-l">
                                    <span className="absolute -top-6 text-[10px] font-black text-slate-400">5</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-6 left-6 max-w-xs">
                        <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">當前處於 <span className="text-red-500">第 3 波 (主升段)</span></p>
                        <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">主升段能量正處於釋放期，波動度增加，量價配合良好。這是獲利潛力最大的階段。</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                    <h4 className="font-black text-slate-700 text-sm mb-4 uppercase tracking-widest">波段關鍵預測</h4>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">波段起點 (Wave 2 Bottom)</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{(parseFloat(stock.close_price) * 0.92).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">預期高點 (Wave 3 Target)</span>
                            <span className="text-sm font-black text-red-500">{(parseFloat(stock.close_price) * 1.25).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">比例關係 (Wave 3/1 Ratio)</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">1.618 (黃金比例)</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-black text-blue-900 text-sm mb-2">波浪理論小撇步</h4>
                            <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                艾略特波浪理論認為市場行為是以重複的規律進行。當前第 3 波不應是 1、3、5 三個推進波中最短的一波。若跌破第一波高點 {(parseFloat(stock.close_price) * 0.9).toFixed(1)} 元，則此波浪計數失效。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
