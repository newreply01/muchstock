import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { getHistory } from '../../utils/api';
import { MACD } from 'technicalindicators';
import { Activity } from 'lucide-react';

export default function MACDView({ symbol, period = '日K' }) {
    const chartContainerRef = useRef();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let chart = null;
        let isMounted = true;

        const initChart = async () => {
            setLoading(true);
            try {
                const historyData = await getHistory(symbol, 300, period);

                if (!isMounted || !historyData || historyData.length === 0 || !chartContainerRef.current) {
                    setLoading(false);
                    return;
                }

                // ... Preparation logic ...
                const closePrices = historyData.map(d => parseFloat(d.close));

                const macdInput = {
                    values: closePrices,
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    SimpleMAOscillator: false,
                    SimpleMASignal: false
                };

                const macdResult = MACD.calculate(macdInput);
                const offset = historyData.length - macdResult.length;

                const candlestickData = [];
                const macdLineData = [];
                const signalLineData = [];
                const histogramData = [];

                historyData.forEach((d, i) => {
                    candlestickData.push({
                        time: d.time,
                        open: parseFloat(d.open),
                        high: parseFloat(d.high),
                        low: parseFloat(d.low),
                        close: parseFloat(d.close),
                    });

                    if (i >= offset) {
                        const m = macdResult[i - offset];
                        if (m && m.MACD !== undefined) {
                            macdLineData.push({ time: d.time, value: m.MACD });
                            signalLineData.push({ time: d.time, value: m.signal });
                            histogramData.push({
                                time: d.time,
                                value: m.histogram,
                                color: m.histogram >= 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'
                            });
                        }
                    }
                });

                if (!isMounted) return;

                // Create Chart
                chart = createChart(chartContainerRef.current, {
                    layout: {
                        background: { type: 'solid', color: 'transparent' },
                        textColor: '#64748b',
                    },
                    grid: {
                        vertLines: { color: '#f1f5f9' },
                        horzLines: { color: '#f1f5f9' },
                    },
                    leftPriceScale: {
                        visible: true,
                        borderColor: '#e2e8f0',
                    },
                    rightPriceScale: {
                        scaleMargins: {
                            top: 0.1,
                            bottom: 0.4,
                        },
                    },
                    timeScale: {
                        borderColor: '#e2e8f0',
                    },
                    crosshair: {
                        mode: 1,
                    }
                });

                const candleSeries = chart.addSeries(CandlestickSeries, {
                    upColor: '#ef4444',
                    downColor: '#22c55e',
                    borderVisible: false,
                    wickUpColor: '#ef4444',
                    wickDownColor: '#22c55e',
                });
                candleSeries.setData(candlestickData);

                chart.priceScale('left').applyOptions({
                    scaleMargins: {
                        top: 0.7,
                        bottom: 0,
                    },
                    autoScale: true,
                });

                const histSeries = chart.addSeries(HistogramSeries, {
                    priceScaleId: 'left',
                });
                histSeries.setData(histogramData);

                const macdSeries = chart.addSeries(LineSeries, {
                    color: '#3b82f6',
                    lineWidth: 2,
                    priceScaleId: 'left',
                });
                macdSeries.setData(macdLineData);

                const signalSeries = chart.addSeries(LineSeries, {
                    color: '#f59e0b',
                    lineWidth: 2,
                    priceScaleId: 'left',
                });
                signalSeries.setData(signalLineData);

                chart.timeScale().fitContent();

            } catch (err) {
                console.error("Failed to load MACD data:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        initChart();

        const handleResize = () => {
            if (chartContainerRef.current && chart) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            isMounted = false;
            window.removeEventListener('resize', handleResize);
            if (chart) {
                chart.remove();
            }
        };
    }, [symbol, period]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col">
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl border border-blue-200">
                    <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">MACD 動能指標</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Moving Average Convergence Divergence</p>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[500px] relative">
                {loading ? (
                    <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl flex-col">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                        <p className="font-bold tracking-widest text-sm uppercase text-slate-500">計算技術指標中...</p>
                    </div>
                ) : null}

                {/* Legend Context */}
                <div className="flex items-center gap-6 mb-4 text-sm font-bold">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#3b82f6]"></span>
                        <span className="text-slate-600">DIF (12, 26)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#f59e0b]"></span>
                        <span className="text-slate-600">MACD (9)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#ef4444]"></span>
                        <span className="text-slate-600">OSC 正柱</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#22c55e]"></span>
                        <span className="text-slate-600">OSC 負柱</span>
                    </div>
                </div>

                <div
                    ref={chartContainerRef}
                    className="flex-1 w-full"
                />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed font-medium">
                MACD (平滑異同移動平均線) 用於研判趨勢與動能。當 DIF (藍線) 向上突破 MACD (黃線) 呈黃金交叉，且柱狀體由綠轉紅，通常視為買進訊號；反之為賣出訊號。上方為日 K 線圖，下方為 MACD 指標。
            </div>
        </div>
    );
}
