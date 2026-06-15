import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { X, Loader2 } from 'lucide-react';
import { getComparisonData } from '../../utils/api';

const COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6'  // Purple
];

export default function ComparisonChart({ symbols, onClose }) {
    const chartContainerRef = useRef();
    const [loading, setLoading] = useState(true);
    const [seriesData, setSeriesData] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setLoading(true);
            try {
                const data = await getComparisonData(symbols, 100); // Compare last 100 days
                if (isMounted) {
                    setSeriesData(data);
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
                tickMarkFormatter: (time) => {
                    return time;
                }
            },
            autoSize: true,
        });

        // Add a line series for each symbol
        const legendItems = [];

        symbols.forEach((sym, index) => {
            if (seriesData[sym] && seriesData[sym].length > 0) {
                const color = COLORS[index % COLORS.length];
                const series = chart.addLineSeries({
                    color,
                    lineWidth: 2,
                    crosshairMarkerRadius: 4,
                    crosshairMarkerBorderColor: '#ffffff',
                    crosshairMarkerBackgroundColor: color,
                });

                // transform data to lightweight charts format
                const chartData = seriesData[sym].map(d => ({
                    time: d.time,
                    value: d.compare_percent // Use percentage for comparison
                }));

                series.setData(chartData);

                legendItems.push({
                    symbol: sym,
                    color
                });
            }
        });

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [seriesData, loading, symbols]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">多股走勢比較 <span className="text-slate-500 font-bold ml-2 text-sm">過去 100 交易日 (基準報酬率)</span></h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p className="font-bold tracking-widest text-sm uppercase">讀取歷史報價...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 px-2">
                                {symbols.map((sym, i) => (
                                    <div key={sym} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-sm font-bold text-slate-700">{sym}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Chart Container */}
                            <div
                                ref={chartContainerRef}
                                className="h-[400px] w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
