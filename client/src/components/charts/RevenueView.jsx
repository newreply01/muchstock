import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Line,
    ComposedChart,
    Legend
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function RevenueView({ financials, loading }) {

    const revenueData = useMemo(() => {
        if (!financials?.revenue || financials.revenue.length === 0) return [];

        // Data from API is ordered DESC by year/month. We need it ASC for charting.
        // We also want to calculate YoY and MoM

        const rawData = [...financials.revenue].reverse();

        return rawData.map((item, index) => {
            const currentRev = parseFloat(item.revenue);
            let yoy = null;
            let mom = null;

            // MoM
            if (index > 0) {
                const prevRev = parseFloat(rawData[index - 1].revenue);
                if (prevRev > 0) {
                    mom = ((currentRev - prevRev) / prevRev) * 100;
                }
            }

            // YoY (find same month last year, 12 months ago if sequential)
            if (index >= 12) {
                const lastYearRev = parseFloat(rawData[index - 12].revenue);
                if (lastYearRev > 0) {
                    yoy = ((currentRev - lastYearRev) / lastYearRev) * 100;
                }
            }

            return {
                name: `${item.revenue_year}/${String(item.revenue_month).padStart(2, '0')}`,
                revenue: Math.round(currentRev / 1000000) / 100, // Convert to 億 (hundred million)
                yoy: yoy !== null ? Math.round(yoy * 100) / 100 : null,
                mom: mom !== null ? Math.round(mom * 100) / 100 : null,
                raw_revenue: currentRev
            };
        });
    }, [financials]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                <p className="font-bold tracking-widest text-sm uppercase">讀取營收數據...</p>
            </div>
        );
    }

    if (!revenueData || revenueData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <BarChart3 className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-600 mb-2 tracking-tighter">暫無營收歷史數據</h3>
            </div>
        );
    }

    const latest = revenueData[revenueData.length - 1];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl min-w-[200px]">
                    <p className="font-bold text-slate-800 dark:text-slate-100 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">{label} 月營收</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center mb-1.5 text-sm">
                            <span style={{ color: entry.color }} className="font-bold flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                {entry.name}:
                            </span>
                            <span className="font-black text-slate-700 tabular-nums">
                                {entry.value !== null ? entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                {entry.name.includes('增率') ? '%' : ' 億'}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Context Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-brand-primary/10 p-2.5 rounded-xl border border-brand-primary/20">
                    <BarChart3 className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">營收追蹤與成長分析</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Revenue & Growth Rate</p>
                </div>
            </div>

            {/* Latest Month Highlight */}
            {latest && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out opacity-50"></div>
                        <div className="relative z-10">
                            <div className="text-slate-500 text-xs mb-2 flex items-center gap-1.5 font-bold">
                                最新單月營收 <span className="text-[10px] text-slate-400 font-normal">({latest.name})</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{latest.revenue.toFixed(2)}</span>
                                <span className="text-sm font-bold text-slate-500">億元</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out opacity-20 ${latest.yoy >= 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div className="relative z-10">
                            <div className="text-slate-500 text-xs mb-2 flex items-center gap-1.5 font-bold">
                                年增率 (YoY)
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black tabular-nums ${latest.yoy >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {latest.yoy !== null ? `${latest.yoy > 0 ? '+' : ''}${latest.yoy.toFixed(2)}%` : '-'}
                                </span>
                                {latest.yoy !== null && (
                                    latest.yoy >= 0 ? <TrendingUp className="w-5 h-5 text-red-500" /> : <TrendingDown className="w-5 h-5 text-green-600" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out opacity-20 ${latest.mom >= 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div className="relative z-10">
                            <div className="text-slate-500 text-xs mb-2 flex items-center gap-1.5 font-bold">
                                月增率 (MoM)
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black tabular-nums ${latest.mom >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {latest.mom !== null ? `${latest.mom > 0 ? '+' : ''}${latest.mom.toFixed(2)}%` : '-'}
                                </span>
                                {latest.mom !== null && (
                                    latest.mom >= 0 ? <TrendingUp className="w-5 h-5 text-red-500" /> : <TrendingDown className="w-5 h-5 text-green-600" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Container */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
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
                            yAxisId="left"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}`}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar yAxisId="left" name="單月營收" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line yAxisId="right" name="年增率(YoY)" type="monotone" dataKey="yoy" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" name="月增率(MoM)" type="monotone" dataKey="mom" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="mt-0.5 bg-blue-100 p-1.5 rounded-lg text-blue-600">
                    <DollarSign className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-900">分析提示</h4>
                    <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                        觀察長期營收長條圖的趨勢是否向上，並搭配年增率 (紅色折線) 跨越 0 軸的狀況，可判斷企業是否脫離衰退期或正進入高速成長期。月增率 (綠色折線) 則有助於觀察短期動能。
                    </p>
                </div>
            </div>
        </div>
    );
}
