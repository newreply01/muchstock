import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { getHistory } from '../../utils/api';
import { RSI } from 'technicalindicators';
import { Activity } from 'lucide-react';

export default function RSIView({ symbol, period = '日K' }) {
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

                const rsiInput = {
                    values: closePrices,
                    period: 14
                };

                const rsiResult = RSI.calculate(rsiInput);
                const offset = historyData.length - rsiResult.length;

                const candlestickData = [];
                const rsiLineData = [];

                historyData.forEach((d, i) => {
                    candlestickData.push({
                        time: d.time,
                        open: parseFloat(d.open),
                        high: parseFloat(d.high),
                        low: parseFloat(d.low),
                        close: parseFloat(d.close),
                    });

                    if (i >= offset) {
                        const r = rsiResult[i - offset];
                        if (r !== undefined) {
                            rsiLineData.push({ time: d.time, value: r });
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
                    minValue: 0,
                    maxValue: 100,
                });

                const rsiSeries = chart.addSeries(LineSeries, {
                    color: '#8b5cf6',
                    lineWidth: 2,
                    priceScaleId: 'left',
                });
                rsiSeries.setData(rsiLineData);

                rsiSeries.createPriceLine({
                    price: 70,
                    color: '#ef4444',
                    lineWidth: 1,
                    lineStyle: 2,
                    title: '超買(70)',
                });
                rsiSeries.createPriceLine({
                    price: 30,
                    color: '#22c55e',
                    lineWidth: 1,
                    lineStyle: 2,
                    title: '超賣(30)',
                });

                chart.timeScale().fitContent();

            } catch (err) {
                console.error("Failed to load RSI data:", err);
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col min-h-[500px]">
            <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2.5 rounded-xl border border-purple-200">
                    <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">RSI 相對強弱指標</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Relative Strength Index</p>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative">
                {loading ? (
                    <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl flex-col">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                        <p className="font-bold tracking-widest text-sm uppercase text-slate-500">計算技術指標中...</p>
                    </div>
                ) : null}

                {/* Legend Context */}
                <div className="flex items-center gap-6 mb-4 text-sm font-bold">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#8b5cf6]"></span>
                        <span className="text-slate-600">RSI (14)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">超買線: 70</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">超賣線: 30</span>
                    </div>
                </div>

                <div
                    ref={chartContainerRef}
                    className="flex-1 w-full"
                />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed font-medium">
                RSI (相對強弱指標) 衡量一定期間內股價漲跌的相對強弱情況。數值範圍在 0 至 100 之間。一般認為 RSI 大於 70 進入「超買區」，隨時有回檔風險；RSI 小於 30 進入「超賣區」，有反彈契機。上方為日 K 線圖，下方為 RSI(14) 指標。
            </div>
        </div>
    );
}
