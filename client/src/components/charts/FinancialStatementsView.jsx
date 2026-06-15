import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Activity, FileText } from 'lucide-react';
import RevenueView from './RevenueView';
import ValuationView from './ValuationView';
import DividendView from './DividendView';
import FinancialStatementsTable from '../shared/FinancialStatementsTable';
import ProfitabilityView from './ProfitabilityView';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend
} from 'recharts';

export default function FinancialStatementsView({
    stock,
    subTab,
    subSubTab,
    financials,
    loading,
    epsData
}) {
    console.log('FinancialStatementsView:', { subTab, subSubTab });

    // 獲利能力 -> 各種趨勢圖表
    if (subTab === 'profitability') {
        if (subSubTab === 'eps_trend') {
            return (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[450px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-blue-600 w-5 h-5" />
                        每股盈餘 (EPS) 走勢分析
                    </h3>
                    <div className="flex-1 w-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm animate-pulse">數據載入中...</div>
                        ) : epsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={epsData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#2563eb' }}
                                    />
                                    <Legend verticalAlign="top" align="right" height={36} />
                                    <Line name="每股盈餘 (EPS)" type="monotone" dataKey="eps" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">暫無 EPS 歷史數據</div>
                        )}
                    </div>
                </div>
            );
        }

        if (subSubTab === 'margin_trend' || subSubTab === 'roe_roa') {
            return (
                <ProfitabilityView
                    financials={financials}
                    loading={loading}
                    subSubTab={subSubTab}
                />
            );
        }

        return (
            <div className="animate-in fade-in duration-300">
                <ValuationView
                    financials={financials}
                    loading={loading}
                    currentPe={stock.pe_ratio}
                    currentPb={stock.pb_ratio}
                />
            </div>
        );
    }

    if (subTab === 'revenue_growth') {
        return (
            <div className="animate-in fade-in duration-300">
                <RevenueView financials={financials} loading={loading} />
            </div>
        );
    }

    if (subTab === 'reports') {
        const statements = financials?.statements || {};
        let data = [];
        let title = "財務報表";

        if (subSubTab === 'balance_sheet') {
            data = statements.balanceSheet || [];
            title = "資產負債表";
        } else if (subSubTab === 'income_statement') {
            data = statements.incomeStatement || [];
            title = "損益表";
        } else if (subSubTab === 'cash_flow') {
            data = statements.cashFlow || [];
            title = "現金流量表";
        }

        return (
            <div className="animate-in fade-in duration-300">
                <FinancialStatementsTable data={data} title={title} />
            </div>
        );
    }

    if (subTab === 'dividend') {
        return (
            <div className="animate-in fade-in duration-300">
                <DividendView dividends={financials?.dividends} loading={loading} />
            </div>
        );
    }

    // Default Placeholder
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[450px] animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800 shadow-inner">
                <BarChart3 className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-600 mb-2 tracking-tighter">數據準備中</h3>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {subTab} - {subSubTab || 'NONE'}
            </p>
        </div>
    );
}
