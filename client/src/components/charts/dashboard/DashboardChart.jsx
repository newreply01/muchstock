import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';

export default function DashboardChart({ historyData, stockName, theme = 'dark' }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [bbValues, setBbValues] = useState({ upper: '--', middle: '--', lower: '--' });
    const [volInfo, setVolInfo] = useState('');

    const isDark = theme === 'dark';
    const bg = isDark ? '#111827' : '#ffffff';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const crossColor = isDark ? '#475569' : '#94a3b8';

    useEffect(() => {
        if (!chartRef.current || !historyData || historyData.length === 0) return;

        // Cleanup previous
        if (chartInstance.current) {
            chartInstance.current.remove();
            chartInstance.current = null;
        }

        const chart = createChart(chartRef.current, {
            width: chartRef.current.clientWidth || 600,
            height: 420,
            layout: { background: { color: bg }, textColor, fontSize: 11 },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            crosshair: { mode: 0, vertLine: { color: crossColor }, horzLine: { color: crossColor } },
            rightPriceScale: { borderColor: gridColor },
            timeScale: { borderColor: gridColor, timeVisible: false },
        });
        chartInstance.current = chart;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== chartRef.current) return;
            const newRect = entries[0].contentRect;
            if (newRect.width > 0 && newRect.height > 0) {
                chart.applyOptions({ width: newRect.width, height: newRect.height });
            }
        });
        resizeObserver.observe(chartRef.current);

        // Watermark
        if (stockName) {
            chart.applyOptions({
                watermark: {
                    visible: true,
                    text: stockName,
                    fontSize: 48,
                    color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    horzAlign: 'center',
                    vertAlign: 'center',
                },
            });
        }

        // Ensure data is sorted in ascending order (oldest first)
        const sorted = [...historyData].sort((a, b) => {
            const timeA = new Date(a.trade_date || a.time).getTime();
            const timeB = new Date(b.trade_date || b.time).getTime();
            return timeA - timeB;
        });

        const candles = sorted
            .filter(d => (d.trade_date || d.time) && !isNaN(parseFloat(d.open_price || d.open)))
            .map(d => {
                const rawTime = d.trade_date || d.time;
                return {
                    time: typeof rawTime === 'string' ? rawTime.split('T')[0] : rawTime,
                    open: parseFloat(d.open_price || d.open),
                    high: parseFloat(d.high_price || d.high),
                    low: parseFloat(d.low_price || d.low),
                    close: parseFloat(d.close_price || d.close),
                };
            });

        const volumes = sorted
            .filter(d => (d.trade_date || d.time))
            .map(d => {
                const rawTime = d.trade_date || d.time;
                const cl = parseFloat(d.close_price || d.close);
                const op = parseFloat(d.open_price || d.open);
                return {
                    time: typeof rawTime === 'string' ? rawTime.split('T')[0] : rawTime,
                    value: parseInt(d.volume) || 0,
                    color: cl >= op ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)',
                };
            });

        // Candlestick
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#ef4444', downColor: '#22c55e', borderDownColor: '#22c55e', borderUpColor: '#ef4444',
            wickDownColor: '#22c55e', wickUpColor: '#ef4444',
        });
        candleSeries.setData(candles);

        // Volume
        const volSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'vol',
        });
        volSeries.setData(volumes);
        chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

        // SMA lines
        const calcSMA = (data, period) => {
            const result = [];
            for (let i = period - 1; i < data.length; i++) {
                let sum = 0;
                for (let j = 0; j < period; j++) sum += data[i - j].close;
                result.push({ time: data[i].time, value: sum / period });
            }
            return result;
        };

        const sma5 = calcSMA(candles, 5);
        const sma20 = calcSMA(candles, 20);
        const sma60 = calcSMA(candles, 60);

        if (sma5.length > 0) {
            const s5 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
            s5.setData(sma5);
        }
        if (sma20.length > 0) {
            const s20 = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
            s20.setData(sma20);
        }
        if (sma60.length > 0) {
            const s60 = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
            s60.setData(sma60);
        }

        // Bollinger Bands (20, 2)
        let bbUpperData = [], bbLowerData = [];
        if (candles.length >= 20) {
            for (let i = 19; i < candles.length; i++) {
                let sum = 0;
                for (let j = 0; j < 20; j++) sum += candles[i - j].close;
                const mean = sum / 20;
                let variance = 0;
                for (let j = 0; j < 20; j++) variance += Math.pow(candles[i - j].close - mean, 2);
                const std = Math.sqrt(variance / 20);
                bbUpperData.push({ time: candles[i].time, value: mean + 2 * std });
                bbLowerData.push({ time: candles[i].time, value: mean - 2 * std });
            }
            const bbu = chart.addSeries(LineSeries, { color: 'rgba(139,92,246,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
            bbu.setData(bbUpperData);
            const bbl = chart.addSeries(LineSeries, { color: 'rgba(139,92,246,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
            bbl.setData(bbLowerData);

            if (bbUpperData.length > 0 && sma20.length > 0) {
                setBbValues({
                    upper: bbUpperData[bbUpperData.length - 1].value.toFixed(2),
                    middle: sma20[sma20.length - 1].value.toFixed(2),
                    lower: bbLowerData[bbLowerData.length - 1].value.toFixed(2),
                });
            }
        }

        // Volume info
        if (volumes.length > 0) {
            const lastVol = volumes[volumes.length - 1].value;
            setVolInfo(`成交量 ${lastVol >= 100000000 ? (lastVol / 100000000).toFixed(1) + '億' : lastVol >= 10000 ? (lastVol / 10000).toFixed(0) + '萬' : lastVol.toLocaleString()} 張`);
        }

        chart.timeScale().fitContent();

        return () => {
            resizeObserver.disconnect();
            if (chartInstance.current) { chartInstance.current.remove(); chartInstance.current = null; }
        };
    }, [historyData, theme]);

    const calcLatestSMA = (data, period) => {
        if (!data || data.length < period) return null;
        let sum = 0;
        // Data is ascending (oldest first). To get latest SMA, sum the last `period` elements.
        for (let i = data.length - 1; i >= data.length - period; i--) {
            sum += parseFloat(data[i].close_price || data[i].close || 0);
        }
        return (sum / period).toFixed(2);
    };

    return (
        <div className="sd-panel" style={{ padding: 0, position: 'relative' }}>
            <div className="sd-sma-bar">
                <span style={{ fontWeight: 800 }}>日線</span>
                <span style={{ color: '#f59e0b' }}>SMA5 {calcLatestSMA(historyData, 5) || '--'}</span>
                <span style={{ color: '#3b82f6' }}>SMA20 {calcLatestSMA(historyData, 20) || '--'}</span>
                <span style={{ color: '#a855f7' }}>SMA60 {calcLatestSMA(historyData, 60) || '--'}</span>
                <span style={{ color: '#8b5cf6', opacity: 0.7 }}>布林通道(20,2)</span>
            </div>
            {/* Bollinger Band value labels overlay */}
            <div style={{ position: 'absolute', left: 8, top: 40, zIndex: 2, fontSize: 10, fontWeight: 700, lineHeight: 1.6, pointerEvents: 'none' }}>
                <div style={{ color: 'rgba(139,92,246,0.7)' }}>布林通道(20,2)</div>
                <div style={{ color: '#ef4444' }}>上軌 {bbValues.upper}</div>
                <div style={{ color: '#3b82f6' }}>中軌 {bbValues.middle}</div>
                <div style={{ color: '#22c55e' }}>下軌 {bbValues.lower}</div>
            </div>
            {/* Volume info overlay */}
            {volInfo && (
                <div style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 2, fontSize: 10, fontWeight: 600, color: textColor, pointerEvents: 'none' }}>
                    {volInfo}
                </div>
            )}
            <div ref={chartRef} className="sd-chart-container" />
        </div>
    );
}
