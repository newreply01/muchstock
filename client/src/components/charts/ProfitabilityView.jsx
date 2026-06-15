import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine
} from 'recharts';
import { TrendingUp, Activity, PieChart, Percent } from 'lucide-react';

export default function ProfitabilityView({ financials, loading, subSubTab }) {

    const chartData = useMemo(() => {
        const ratios = financials?.ratios || [];
        if (ratios.length === 0) return [];

        // Group by date (keep ISO for sorting/mapping)
        const grouped = ratios.reduce((acc, curr) => {
            const dateStr = new Date(curr.date).toISOString().split('T')[0];
            if (!acc[dateStr]) acc[dateStr] = { date: dateStr, name: new Date(curr.date).toLocaleDateString('zh-TW', { year: '2-digit', month: '2-digit' }) };
            acc[dateStr][curr.item] = parseFloat(curr.value);
            return acc;
        }, {});

        // Convert to array and sort ASC
        return Object.values(grouped).sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
    }, [financials]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                <p className="font-bold tracking-widest text-sm uppercase">讀取獲利能力數據...</p>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <TrendingUp className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-600 mb-2 tracking-tighter">暫無獲利能力數據</h3>
                <p className="text-xs text-slate-400">請確認資料庫中已同步 TaiwanStockFinancialRatios 數據</p>
            </div>
        );
    }

    const renderMarginChart = () => (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-6 flex items-center gap-2">
                <Percent className="text-blue-600 w-5 h-5" />
                三率走勢分析 (毛利/營業/淨利)
            </h3>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                            formatter={(v) => [`${v}%`, '']}
                        />
                        <Legend verticalAlign="top" align="right" height={36} />
                        <Line name="毛利率" type="monotone" dataKey="GrossProfitMargin" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                        <Line name="營業利益率" type="monotone" dataKey="OperatingIncomeMargin" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                        <Line name="淨利率" type="monotone" dataKey="NetIncomeMargin" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const renderRoeRoaChart = () => (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-6 flex items-center gap-2">
                <Activity className="text-purple-600 w-5 h-5" />
                ROE / ROA 報酬率趨勢
            </h3>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                            formatter={(v) => [`${v}%`, '']}
                        />
                        <Legend verticalAlign="top" align="right" height={36} />
                        <Line name="ROE (股東權益報酬率)" type="monotone" dataKey="ROE" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                        <Line name="ROA (資產報酬率)" type="monotone" dataKey="ROA" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                        <ReferenceLine y={0} stroke="#64748b" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2.5 rounded-xl border border-blue-200">
                    <PieChart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">
                        {subSubTab === 'roe_roa' ? 'ROE/ROA 報酬分析' : '獲利能力指標趨勢'}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Profitability Metrics</p>
                </div>
            </div>

            {subSubTab === 'roe_roa' ? renderRoeRoaChart() : renderMarginChart()}

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="mt-0.5 bg-blue-100 p-1.5 rounded-lg text-blue-600">
                    <Activity className="w-4 h-4" />
                </div>
                <div className="text-xs text-blue-800 leading-relaxed">
                    <h4 className="font-bold mb-1">分析小提示</h4>
                    {subSubTab === 'roe_roa' ? (
                        <p>優質企業的 ROE 通常能長期維持在 15% 以上。若 ROE 持續上升且 ROA 同步成長，顯示資產利用效率提升且並未過度依賴負債槓桿。</p>
                    ) : (
                        <p>觀察「三率」是否同步成長。若毛利率上升但淨利率下降，可能代表營業費用過高或有業外損失。長期穩定的高毛利是競爭優勢（護城河）的最直接體現。</p>
                    )}
                </div>
            </div>
        </div>
    );
}
