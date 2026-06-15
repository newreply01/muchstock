import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ValuationView({ financials, loading, currentPe, currentPb }) {

    // Financials from server: { info, revenue, eps, dividends, statements }
    const info = financials?.info || {};

    // EPS Data is quarterly, we will plot EPS trend
    const epsData = useMemo(() => {
        const sourceData = financials?.eps || [];
        if (sourceData.length === 0) return [];
        // Data is DESC by date from API, need ASC for chart
        return [...sourceData].reverse().map(item => ({
            name: item.date ? new Date(item.date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit' }) : 'N/A',
            eps: parseFloat(item.value || item.eps)
        }));
    }, [financials]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                <p className="font-bold tracking-widest text-sm uppercase">讀取估值數據...</p>
            </div>
        );
    }

    if (epsData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Target className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-600 mb-2 tracking-tighter">暫無估值歷史數據</h3>
            </div>
        );
    }

    const latestEps = epsData[epsData.length - 1];

    // Safety check for PE parsing - use prop or fallback to info from financials
    const peValue = parseFloat(currentPe) || parseFloat(info.pe_ratio);
    const pbValue = parseFloat(currentPb) || parseFloat(info.pb_ratio);
    const hasValidPe = !isNaN(peValue) && peValue > 0;

    // Evaluate valuation status roughly
    let valuationStatus = '中性區間';
    let statusColor = 'text-slate-500';
    let statusBg = 'bg-slate-50 dark:bg-slate-800';
    let statusBorder = 'border-slate-200 dark:border-slate-800';

    if (hasValidPe) {
        if (peValue < 12) {
            valuationStatus = '低本益比 / 偏低估';
            statusColor = 'text-green-600';
            statusBg = 'bg-green-50';
            statusBorder = 'border-green-200';
        } else if (peValue > 25) {
            valuationStatus = '高本益比 / 存在溢價風險';
            statusColor = 'text-red-500';
            statusBg = 'bg-red-50';
            statusBorder = 'border-red-200';
        } else {
            valuationStatus = '合理估值區間 (PE 12~25)';
            statusColor = 'text-blue-600';
            statusBg = 'bg-blue-50';
            statusBorder = 'border-blue-200';
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Context Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-2.5 rounded-xl border border-purple-200">
                    <Target className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">估值與獲利能力分析</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Valuation & Profitability</p>
                </div>
            </div>

            {/* Current Metrics Highlight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="text-slate-500 text-xs mb-2 font-bold">目前本益比 (PE)</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                            {hasValidPe ? peValue.toFixed(2) : '-'}
                        </span>
                        <span className="text-sm font-bold text-slate-400">倍</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="text-slate-500 text-xs mb-2 font-bold">目前股價淨值比 (PB)</div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                            {!isNaN(pbValue) ? pbValue.toFixed(2) : '-'}
                        </span>
                        <span className="text-sm font-bold text-slate-400">倍</span>
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${statusBorder} ${statusBg} flex flex-col justify-between`}>
                    <div className={`text-xs mb-2 font-bold ${statusColor} opacity-80 flex items-center gap-1.5`}>
                        <AlertTriangle className="w-4 h-4" /> 估值位階判定
                    </div>
                    <div className={`text-lg font-black ${statusColor} leading-tight`}>
                        {valuationStatus}
                    </div>
                </div>
            </div>

            {/* EPS Trend Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[350px]">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="text-purple-600 w-5 h-5" />
                    近 8 季每股盈餘 (EPS) 走勢
                </h3>
                <line_number>: </line_number>                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={epsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                itemStyle={{ color: '#9333ea', fontWeight: '900' }}
                                formatter={(value) => [`${value} 元`, '單季 EPS']}
                                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                            />
                            <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
                            <Line
                                type="monotone"
                                dataKey="eps"
                                stroke="#9333ea"
                                strokeWidth={3}
                                dot={{ fill: '#9333ea', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                activeDot={{ r: 7, strokeWidth: 0 }}
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed font-medium">
                註：EPS 為單季資料，本益比 (PE) 採用滾動近四季 EPS 計算。當前位階判定僅為簡易邏輯分類，實際估值應同時參考同業平均與歷史區間。
            </div>
        </div>
    );
}
