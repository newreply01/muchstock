import React, { useState, useEffect } from 'react';
import { getMarketMargin } from '../../utils/api';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity, AlertCircle } from 'lucide-react';

export default function MarketMarginChart() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getMarketMargin();
                if (res.success && res.data) {
                    const processed = res.data.map((d) => {
                        return {
                            ...d,
                            margin100M: d.margin_balance ? parseFloat((d.margin_balance / 100000000).toFixed(2)) : 0,
                            short10K: d.short_balance ? parseFloat((d.short_balance / 10000).toFixed(2)) : 0,
                            indexPrice: d.index_price ? parseFloat(d.index_price) : null,
                            date: d.trade_date ? new Date(d.trade_date).toLocaleDateString() : ''
                        };
                    });
                    setData(processed);
                }
            } catch (err) {
                console.error('Fetch market margin failed', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 bg-white/50 rounded-2xl border border-gray-100 animate-pulse mb-6">
                <Activity className="w-8 h-8 text-brand-primary mb-2 opacity-50" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">載入融資融券餘額...</span>
            </div>
        );
    }

    if (!data || data.length === 0) return null;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-slate-800 shadow-lg rounded-xl">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">{label}</p>
                    {payload.map((entry, idx) => (
                        <p key={idx} className="text-xs font-semibold" style={{ color: entry.color }}>
                            {entry.name}: {
                                entry.name.includes('融資') ? `${entry.value}億` : 
                                entry.name.includes('融券') ? `${entry.value}萬張` : 
                                Math.round(entry.value)
                            }
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    大盤融資融券餘額
                    <div className="group relative flex items-center">
                        <AlertCircle className="w-4 h-4 text-gray-400 cursor-help hover:text-brand-primary transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl text-left font-normal leading-relaxed pointer-events-none">
                            <span className="font-bold text-amber-400 block mb-1">💡 什麼是融資融券？</span>
                            <span className="font-bold">融資：</span>向券商借錢買股，看多。<br />
                            <span className="font-bold">融券：</span>向券商借股賣出，看空。<br /><br />
                            當融資持續增加，代表散戶信心強，但也隱含未來賣壓；融券增加則代表看空力道增強，但也可能引發軋空行情。
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900"></div>
                        </div>
                    </div>
                </h3>
            </div>

            <div className="h-64 md:h-80 w-full relative group">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            tickMargin={10}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        {/* 左 Y 軸：融券餘額 (綠色) */}
                        <YAxis
                            yAxisId="y-short"
                            orientation="left"
                            domain={['auto', 'auto']}
                            tick={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                            tickFormatter={(v) => `${v}萬`}
                        />
                        {/* 右 Y 軸 1：融資餘額 (藍色) */}
                        <YAxis
                            yAxisId="y-margin"
                            orientation="right"
                            domain={['auto', 'auto']}
                            tick={{ fill: '#3b82f6', fontSize: 10, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                            tickFormatter={(v) => `${Math.round(v)}億`}
                        />
                        {/* 右 Y 軸 2：大盤指數 (紅色，偏移) */}
                        <YAxis
                            yAxisId="y-index"
                            orientation="right"
                            domain={['auto', 'auto']}
                            tick={{ fill: '#ef4444', fontSize: 10, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            width={50}
                            dx={10}
                            tickFormatter={(v) => Math.round(v)}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingTop: '10px' }} />

                        <Bar
                            yAxisId="y-margin"
                            dataKey="margin100M"
                            name="融資餘額(億)"
                            fill="#3b82f6"
                            barSize={10}
                            radius={[2, 2, 0, 0]}
                        />
                        <Bar
                            yAxisId="y-short"
                            dataKey="short10K"
                            name="融券餘額(萬張)"
                            fill="#10b981"
                            barSize={10}
                            radius={[2, 2, 0, 0]}
                        />
                        <Line
                            yAxisId="y-index"
                            type="monotone"
                            dataKey="indexPrice"
                            name="大盤指數 (加權)"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
