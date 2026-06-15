import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { getHistory } from '../../utils/api';
import { Stochastic } from 'technicalindicators';
import { Activity } from 'lucide-react';

export default function KDView({ symbol, period = '日K' }) {
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

                // ... Preparation ...
                const highPrices = historyData.map(d => parseFloat(d.high));
                const lowPrices = historyData.map(d => parseFloat(d.low));
                const closePrices = historyData.map(d => parseFloat(d.close));

                const kdInput = {
                    high: highPrices,
                    low: lowPrices,
                    close: closePrices,
                    period: 9,
                    signalPeriod: 3
                };

                const kdResult = Stochastic.calculate(kdInput);
                const offset = historyData.length - kdResult.length;

                const candlestickData = [];
                const kLineData = [];
                const dLineData = [];

                historyData.forEach((d, i) => {
                    candlestickData.push({
                        time: d.time,
                        open: parseFloat(d.open),
                        high: parseFloat(d.high),
                        low: parseFloat(d.low),
                        close: parseFloat(d.close),
                    });

                    if (i >= offset) {
                        const kd = kdResult[i - offset];
                        if (kd && kd.k !== undefined && kd.d !== undefined) {
                            kLineData.push({ time: d.time, value: kd.k });
                            dLineData.push({ time: d.time, value: kd.d });
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
                    autoScale: false,
                    mode: 0,
                });

                const kSeries = chart.addSeries(LineSeries, {
                    color: '#3b82f6',
                    lineWidth: 2,
                    priceScaleId: 'left',
                });
                kSeries.setData(kLineData);

                kSeries.createPriceLine({
                    price: 80,
                    color: '#ef4444',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: '超買(80)'
                });
                kSeries.createPriceLine({
                    price: 20,
                    color: '#22c55e',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: '超賣(20)'
                });

                const dSeries = chart.addSeries(LineSeries, {
                    color: '#f59e0b',
                    lineWidth: 2,
                    priceScaleId: 'left',
                });
                dSeries.setData(dLineData);

                chart.timeScale().fitContent();

                chart.priceScale('left').applyOptions({
                    autoscaleInfoProvider: () => ({
                        priceRange: { minValue: 0, maxValue: 100 },
                    }),
                });

            } catch (err) {
                console.error("Failed to load KD data:", err);
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
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">KD 隨機指標</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Stochastic Oscillator</p>
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
                        <span className="text-slate-600">K 值 (快線)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#f59e0b]"></span>
                        <span className="text-slate-600">D 值 (慢線)</span>
                    </div>
                </div>

                <div
                    ref={chartContainerRef}
                    className="flex-1 w-full"
                />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed font-medium">
                KD 指標 (隨機指標) 綜合了動量觀念、強弱指標與移動平均線的優點。K 向上突破 D (黃金交叉) 為買進訊號，跌破 (死亡交叉) 為賣出訊號。數值在 80 以上視為超買區 (紅虛線)，20 以下視為超賣區 (綠虛線)。
            </div>
        </div>
    );
}
