import React, { useState, useEffect, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Area, AreaChart, ReferenceLine, Legend
} from 'recharts';
import { Target, TrendingUp, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';
import { API_BASE } from '../../utils/api';

const ZONE_STYLES = {
    '便宜區': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-500' },
    '偏低區': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', badge: 'bg-teal-500' },
    '合理區': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-500' },
    '偏貴區': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-500' },
    '昂貴區': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-500' }
};

export default function ValuationRiverView({ symbol }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('pe'); // 'pe' | 'pb' | 'yield'

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        fetch(`${API_BASE}/stock/${symbol}/valuation-history?years=5`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [symbol]);

    const chartData = useMemo(() => {
        if (!data?.history || !data?.bands?.pe || !data?.bands?.pb) return [];
        const { pe: peBands, pb: pbBands } = data.bands; 

        // Sample every Nth point to keep chart performant
        const step = Math.max(1, Math.floor(data.history.length / 200));
        return data.history.filter((_, i) => i % step === 0).map(h => {
            const d = new Date(h.date);
            const row = {
                date: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
                pe: h.pe,
                pb: h.pb,
                dy: h.dy,
            };

            // Map PE bands by index from the array
            peBands.forEach((band, idx) => {
                row[`pe_band_${idx}`] = band.multiplier;
            });
            // Map PB bands
            pbBands.forEach((band, idx) => {
                row[`pb_band_${idx}`] = band.multiplier;
            });

            return row;
        });
    }, [data]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                <p className="font-bold tracking-widest text-sm uppercase">讀取估價歷史...</p>
            </div>
        );
    }

    if (error || !data?.success || !data.history?.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
                <p className="font-bold text-slate-600">估價歷史載入失敗</p>
                <p className="text-sm text-slate-400 mt-1">{error || '無歷史PE/PB數據'}</p>
            </div>
        );
    }

    const { currentPrice, currentPe, zone, stats, yieldValuation } = data;
    const peBands = data.bands?.pe || [];
    const pbBands = data.bands?.pb || [];
    const zoneStyle = ZONE_STYLES[zone] || ZONE_STYLES['合理區'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-violet-100 p-2.5 rounded-xl border border-violet-200">
                    <Target className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">個股估價模型</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Valuation Model & River Chart</p>
                </div>
            </div>

            {/* Current Valuation Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-xs font-bold text-slate-500 mb-1">當前股價</div>
                    <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{Number(currentPrice || 0).toFixed(2)}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-xs font-bold text-slate-500 mb-1">當前 PE</div>
                    <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{Number(currentPe || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">歷史平均: {stats?.peAvg || '--'}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-xs font-bold text-slate-500 mb-1">歷史 PB 均值</div>
                    <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">{stats?.pbAvg || '--'}</div>
                </div>
                <div className={`p-5 rounded-2xl border-2 ${zoneStyle.border} ${zoneStyle.bg} shadow-sm`}>
                    <div className={`text-xs font-bold ${zoneStyle.text} mb-1 flex items-center gap-1`}>
                        <AlertTriangle className="w-3 h-3" /> 估值位階
                    </div>
                    <div className={`text-2xl font-black ${zoneStyle.text}`}>{zone}</div>
                    <div className={`text-[10px] font-bold text-white ${zoneStyle.badge} px-2 py-0.5 rounded-full inline-block mt-1`}>
                        PE {currentPe ? Number(currentPe).toFixed(1) : '--'} vs 均值 {stats?.peAvg || '--'}
                    </div>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm w-fit">
                {[
                    { id: 'pe', label: '本益比河流圖' },
                    { id: 'pb', label: '淨值比河流圖' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        className={`px-5 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === tab.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100 dark:bg-slate-800'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* River Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 text-sm">
                    <BarChart3 className="w-4 h-4 text-violet-600" />
                    {viewMode === 'pe' ? '本益比 (PE) 河流圖 — 近五年' : '淨值比 (PB) 河流圖 — 近五年'}
                </h3>
                <div className="h-[430px] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                    {(() => {
                        console.log('ValuationRiverView: Rendering chart', { viewMode, hasData: !!data, historyCount: data?.history?.length, bandsCount: peBands.length });
                        return null;
                    })()}
                    {viewMode === 'pe' ? (
                        <AreaChart width={800} height={400} data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="redZone" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="greenZone" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                    formatter={(v, name) => {
                                        return [typeof v === 'number' || typeof v === 'string' ? Number(v).toFixed(2) : v, name];
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                
                                {/* River Areas: Each Area fills the space between this band and the next one (lower) */}
                                {peBands.map((band, idx) => {
                                    if (idx === peBands.length - 1) return null; // Last band has no "next" band below it
                                    
                                    // Define colors based on position
                                    const areaColors = [
                                        '#fee2e2', // 極高估 - 高估 (Red)
                                        '#ffedd5', // 高估 - 偏貴 (Orange)
                                        '#f0f9ff', // 偏貴 - 合理 (Blue)
                                        '#f0fdf4', // 合理 - 偏低 (Green)
                                        '#ccfbf1', // 偏低 - 低估 (Teal)
                                        '#dcfce7', // 低估 - 極低估 (Emerald)
                                    ];

                                    return (
                                        <Area
                                            key={idx}
                                            type="monotone"
                                            dataKey={`pe_band_${idx}`}
                                            stackId="1"
                                            stroke="none"
                                            fill={areaColors[idx] || '#f1f5f9'}
                                            fillOpacity={0.6}
                                            connectNulls
                                            name={band.label}
                                        />
                                    );
                                })}
                                
                                <Line type="monotone" dataKey="pe" stroke="#7c3aed" strokeWidth={3} dot={false} name="當前 PE" activeDot={{ r: 6, strokeWidth: 0 }} />
                            </AreaChart>
                        ) : (
                        <AreaChart width={800} height={400} data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                             {/* ... same internal components as PE ... */}
                             <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                             <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                             <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                             <Tooltip
                                 contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontWeight: 'bold' }}
                                 formatter={(v, name) => [Number(v || 0).toFixed(2), name]}
                             />
                             <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                             {pbBands.map((band, idx) => {
                                 if (idx === pbBands.length - 1) return null;
                                 const areaColors = ['#fffbeb', '#f0f9ff', '#f0fdf4'];
                                 return (
                                     <Area
                                         key={idx}
                                         type="monotone"
                                         dataKey={`pb_band_${idx}`}
                                         stackId="1"
                                         stroke="none"
                                         fill={areaColors[idx] || '#f1f5f9'}
                                         fillOpacity={0.6}
                                         name={band.label}
                                     />
                                 );
                             })}
                             <Line type="monotone" dataKey="pb" stroke="#7c3aed" strokeWidth={3} dot={false} name="當前 PB" activeDot={{ r: 6, strokeWidth: 0 }} />
                        </AreaChart>
                    )}
                </div>
            </div>

            {/* Fair Price Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PE-Based Bands */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-violet-600" /> 本益比估價區間
                    </h3>
                    <div className="space-y-3">
                        {peBands.map((band, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${i === 2 ? 'bg-blue-50' : i < 2 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                <span className={`text-sm font-bold ${i === 2 ? 'text-blue-600' : i < 2 ? 'text-red-500' : 'text-emerald-600'}`}>{band.label}</span>
                                <span className={`text-lg font-black tabular-nums ${i === 2 ? 'text-blue-600' : i < 2 ? 'text-red-500' : 'text-emerald-600'}`}>PE {band.multiplier ? Number(band.multiplier).toFixed(1) : '--'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Yield-Based Valuation */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-emerald-600" /> 殖利率估價法
                    </h3>
                    {yieldValuation ? (
                        <div className="space-y-3">
                            <div className="text-xs text-slate-500 font-medium mb-2">
                                基於近年平均現金股利 <span className="font-black text-slate-800 dark:text-slate-100">{stats?.avgCashDiv} 元</span> 推算
                            </div>
                            {[
                                { label: '便宜價 (6%殖利率)', value: yieldValuation.cheap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: '合理價 (5%殖利率)', value: yieldValuation.fair, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: '昂貴價 (4%殖利率)', value: yieldValuation.expensive, color: 'text-red-500', bg: 'bg-red-50' }
                            ].map((band, i) => (
                                <div key={i} className={`flex items-center justify-between p-4 ${band.bg} rounded-lg`}>
                                    <span className={`text-sm font-bold ${band.color}`}>{band.label}</span>
                                    <div className="text-right">
                                        <span className={`text-2xl font-black tabular-nums ${band.color}`}>{band.value}</span>
                                        <span className="text-xs text-slate-400 ml-1">元</span>
                                    </div>
                                </div>
                            ))}
                            <div className={`mt-2 p-3 rounded-lg ${currentPrice <= parseFloat(yieldValuation.cheap) ? 'bg-emerald-50 border border-emerald-200' : currentPrice >= parseFloat(yieldValuation.expensive) ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                                <div className="text-xs font-bold text-slate-600">
                                    目前股價 <span className="text-lg font-black text-slate-800 dark:text-slate-100">{Number(currentPrice || 0).toFixed(2)}</span> 元
                                    {currentPrice <= parseFloat(yieldValuation.cheap) && <span className="text-emerald-600 ml-2">→ 低於便宜價 ✓</span>}
                                    {currentPrice >= parseFloat(yieldValuation.expensive) && <span className="text-red-500 ml-2">→ 高於昂貴價 ⚠</span>}
                                    {currentPrice > parseFloat(yieldValuation.cheap) && currentPrice < parseFloat(yieldValuation.expensive) && <span className="text-blue-600 ml-2">→ 合理價區間</span>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm italic">
                            無現金股利資料無法進行殖利率估價
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed font-medium">
                註：河流圖基於歷史 PE/PB 的標準差 (σ) 分佈繪製。昂貴/便宜區間用往分位數推算，殖利率估價法以近年平均現金股利的不同殖利率目標反推合理價。所有估價僅供參考，不構成投資建議。
            </div>
        </div>
    );
}
