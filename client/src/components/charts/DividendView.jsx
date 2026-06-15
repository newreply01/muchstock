import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';

export default function DividendView({ dividends, loading }) {
    if (loading) {
        return (
            <div className="h-[400px] flex items-center justify-center text-slate-400 animate-pulse">
                數據載入中...
            </div>
        );
    }

    if (!dividends || dividends.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <DollarSign className="w-12 h-12 mb-4 opacity-20" />
                <p className="italic">暫無股利政策數據</p>
            </div>
        );
    }

    // Prepare data for chart (reverse to chronological order)
    const chartData = [...dividends].reverse().map(d => ({
        year: d.year || d.date?.substring(0, 4) || 'N/A',
        cash: parseFloat(d.cash_earnings_distribution) || 0,
        stock: parseFloat(d.stock_earnings_distribution) || 0,
        total: (parseFloat(d.cash_earnings_distribution) || 0) + (parseFloat(d.stock_earnings_distribution) || 0)
    })).slice(-10); // Show last 10 records

    const latest = chartData[chartData.length - 1];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> 最新現金股利
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {latest.cash.toFixed(2)} <span className="text-xs font-bold text-slate-400 ml-1">元</span>
                    </div>
                </div>
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <div className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> 最新股票股利
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {latest.stock.toFixed(2)} <span className="text-xs font-bold text-slate-400 ml-1">元</span>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 派發年份
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {latest.year} <span className="text-xs font-bold text-slate-400 ml-1">年</span>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                    歷年股利發放趨勢
                </h3>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="year"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar name="現金股利" dataKey="cash" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={30} />
                            <Bar name="股票股利" dataKey="stock" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 font-bold text-slate-600">年份</th>
                            <th className="px-6 py-4 font-bold text-slate-600">現金股利</th>
                            <th className="px-6 py-4 font-bold text-slate-600">股票股利</th>
                            <th className="px-6 py-4 font-bold text-slate-600">合計</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {[...dividends].slice(0, 8).map((d, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:bg-slate-800 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700">{d.year || d.date?.substring(0, 4) || 'N/A'}</td>
                                <td className="px-6 py-4 text-emerald-600 font-bold">{parseFloat(d.cash_earnings_distribution || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-blue-600 font-bold">{parseFloat(d.stock_earnings_distribution || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-100">
                                    {(parseFloat(d.cash_earnings_distribution || 0) + parseFloat(d.stock_earnings_distribution || 0)).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
