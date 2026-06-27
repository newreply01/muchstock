import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { getComparisonData } from '../../utils/api';

const COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6'  // Purple
];

function formatNumber(val, decimals = 2) {
    if (val === null || val === undefined) return '-';
    return Number(val).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

export default function ComparisonChart({ symbols, onClose }) {
    const chartContainerRef = useRef();
    const chartInstanceRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [seriesData, setSeriesData] = useState(null);
    const [infoData, setInfoData] = useState([]);

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                const response = await getComparisonData(symbols, 120);
                if (isMounted && response?.success) {
                    setSeriesData(response.data.chart);
                    setInfoData(response.data.info);
                }
            } catch (err) {
                console.error("Comparison fetch failed:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();
        return () => { isMounted = false; };
    }, [symbols]);

    useEffect(() => {
        if (loading || !seriesData || !chartContainerRef.current) return;

        // Clean up previous instance if any
        if (chartInstanceRef.current) {
            chartInstanceRef.current.remove();
            chartInstanceRef.current = null;
        }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#64748b',
                fontFamily: "'Inter', sans-serif"
            },
            grid: {
                vertLines: { color: '#f1f5f9', style: 1 },
                horzLines: { color: '#f1f5f9', style: 1 },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderVisible: false,
                rightOffset: 12,
                barSpacing: 10,
                fixLeftEdge: true,
                timeVisible: true,
            },
            autoSize: true,
        });
        chartInstanceRef.current = chart;

        symbols.forEach((sym, index) => {
            if (seriesData[sym] && seriesData[sym].length > 0) {
                const color = COLORS[index % COLORS.length];
                const series = chart.addLineSeries({
                    color,
                    lineWidth: 2,
                    crosshairMarkerRadius: 4,
                    crosshairMarkerBorderColor: '#ffffff',
                    crosshairMarkerBackgroundColor: color,
                    priceFormat: {
                        type: 'custom',
                        formatter: price => price.toFixed(2) + '%'
                    }
                });

                const chartData = seriesData[sym].map(d => ({
                    time: d.time,
                    value: d.compare_percent
                }));

                series.setData(chartData);
            }
        });

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current && chartInstanceRef.current) {
                chartInstanceRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartInstanceRef.current) {
                chartInstanceRef.current.remove();
                chartInstanceRef.current = null;
            }
        };
    }, [seriesData, loading, symbols]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter flex items-center gap-3">
                            <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                                <TrendingUp className="w-5 h-5" />
                            </span>
                            多股 PK 比較分析
                        </h2>
                        <p className="text-sm text-slate-500 font-bold mt-1 tracking-widest uppercase">Performance & Valuation Comparison</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white dark:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                    {loading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p className="font-bold tracking-widest text-sm uppercase">分析比對中...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {/* Chart Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">近半年走勢比較 (基準報酬率)</h3>
                                
                                {/* Legend */}
                                <div className="flex flex-wrap gap-4 px-2">
                                    {symbols.map((sym, i) => {
                                        const info = infoData.find(d => d.symbol === sym);
                                        return (
                                            <div key={sym} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                <span className="text-sm font-black text-slate-700">{sym} {info?.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Chart Container */}
                                <div
                                    ref={chartContainerRef}
                                    className="h-[350px] w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 overflow-hidden"
                                />
                            </div>

                            {/* Fundamental Table Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">核心指標 PK</h3>
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="py-4 px-6 w-1/4">股票名稱</th>
                                                <th className="py-4 px-6 text-right">最新收盤價</th>
                                                <th className="py-4 px-6 text-right">本益比 (PE)</th>
                                                <th className="py-4 px-6 text-right">股價淨值比 (PB)</th>
                                                <th className="py-4 px-6 text-right">殖利率 (%)</th>
                                                <th className="py-4 px-6 text-center">產業</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {infoData.map((info, i) => (
                                                <tr key={info.symbol} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                            <span className="font-black text-slate-900 dark:text-slate-50">{info.symbol} {info.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-bold text-slate-700 tabular-nums">
                                                        {formatNumber(info.latest_price)}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-bold tabular-nums">
                                                        {info.pe_ratio ? (
                                                            <span className={info.pe_ratio < 15 ? "text-brand-success" : info.pe_ratio > 25 ? "text-brand-danger" : "text-slate-700"}>
                                                                {formatNumber(info.pe_ratio)}x
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-bold tabular-nums">
                                                        {info.pb_ratio ? (
                                                            <span className={info.pb_ratio < 1.5 ? "text-brand-success" : "text-slate-700"}>
                                                                {formatNumber(info.pb_ratio)}x
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-black tabular-nums">
                                                        {info.dividend_yield ? (
                                                            <span className={info.dividend_yield > 4 ? "text-indigo-600" : "text-slate-700"}>
                                                                {formatNumber(info.dividend_yield)}%
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">{info.industry || '-'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
