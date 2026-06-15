import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { getHistory } from '../../utils/api';
import { ADX } from 'technicalindicators';
import { Activity } from 'lucide-react';

export default function DMIView({ symbol, period = '日K' }) {
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
                const highPrices = historyData.map(d => parseFloat(d.high));
                const lowPrices = historyData.map(d => parseFloat(d.low));
                const closePrices = historyData.map(d => parseFloat(d.close));

                const adxInput = {
                    high: highPrices,
                    low: lowPrices,
                    close: closePrices,
                    period: 14
                };

                const adxResult = ADX.calculate(adxInput);
                const offset = historyData.length - adxResult.length;

                const candlestickData = [];
                const adxLineData = [];
                const pdiLineData = [];
                const mdiLineData = [];

                historyData.forEach((d, i) => {
                    candlestickData.push({
                        time: d.time,
                        open: parseFloat(d.open),
                        high: parseFloat(d.high),
                        low: parseFloat(d.low),
                        close: parseFloat(d.close),
                    });

                    if (i >= offset) {
                        const r = adxResult[i - offset];
                        if (r !== undefined && r.adx !== undefined) {
                            adxLineData.push({ time: d.time, value: r.adx });
                            pdiLineData.push({ time: d.time, value: r.pdi });
                            mdiLineData.push({ time: d.time, value: r.mdi });
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

                const adxSeries = chart.addSeries(LineSeries, {
                    color: '#64748b',
                    lineWidth: 2,
                    priceScaleId: 'left',
                });
                adxSeries.setData(adxLineData);

                const pdiSeries = chart.addSeries(LineSeries, {
                    color: '#ef4444',
                    lineWidth: 1.5,
                    priceScaleId: 'left',
                });
                pdiSeries.setData(pdiLineData);

                const mdiSeries = chart.addSeries(LineSeries, {
                    color: '#22c55e',
                    lineWidth: 1.5,
                    priceScaleId: 'left',
                });
                mdiSeries.setData(mdiLineData);

                chart.timeScale().fitContent();

            } catch (err) {
                console.error("Failed to load DMI data:", err);
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
                <div className="bg-orange-100 p-2.5 rounded-xl border border-orange-200">
                    <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">DMI 動向指數 / ADX 趨勢指標</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Directional Movement Index</p>
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
                        <span className="w-3 h-3 rounded bg-[#ef4444]"></span>
                        <span className="text-slate-600">+DI (多方)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#22c55e]"></span>
                        <span className="text-slate-600">-DI (空方)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-[#64748b]"></span>
                        <span className="text-slate-600">ADX (趨勢強度: {'>'}25明朗)</span>
                    </div>
                </div>

                <div
                    ref={chartContainerRef}
                    className="flex-1 w-full"
                />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed font-medium">
                DMI 透過分析股價上升與下跌趨勢的變化，來預測市場的未來動向。當 +DI (紅線) 大於 -DI (綠線) 時，表示多方力道較強。ADX (灰線) 則用以衡量趨勢的「強度」，ADX 越高代表趨勢越明顯。上方為日 K 線圖，下方為 DMI 與 ADX。
            </div>
        </div>
    );
}
