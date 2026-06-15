import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function ChipAnalysisChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                暫無籌碼數據
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="date"
                        fontSize={10}
                        tick={{ fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    />
                    <YAxis
                        fontSize={10}
                        tick={{ fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => (val / 1000).toLocaleString() + 'K'}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                        labelStyle={{ fontBlack: true, color: '#1e293b', marginBottom: '4px' }}
                    />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                    <Bar name="外資" dataKey="foreign_net" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar name="投信" dataKey="trust_net" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar name="自營商" dataKey="dealer_net" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
