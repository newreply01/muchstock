import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import {
    SMA, RSI, MACD, Stochastic, ADX, BollingerBands,
    bullishengulfingpattern,
    bearishengulfingpattern,
    bullishhammerstick,
    hangingman,
    morningstar,
    eveningstar,
    threewhitesoldiers,
    threeblackcrows,
    piercingline,
} from 'technicalindicators';
import { getHistory } from '../../utils/api';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function StockChart({ stock, period = '日K', onPatternsDetected, onIndicatorStatus }) {
    const mainChartRef = useRef();
    const kdRsiChartRef = useRef();
    const macdChartRef = useRef();
    const dmiChartRef = useRef();

    const mainChartInstance = useRef(null);
    const kdRsiChartInstance = useRef(null);
    const macdChartInstance = useRef(null);
    const dmiChartInstance = useRef(null);

    const [loading, setLoading] = useState(true);
    const [detectedPatterns, setDetectedPatterns] = useState([]);
    
    // 開關控制狀態
    const [showMA20, setShowMA20] = useState(true);
    const [showBB, setShowBB] = useState(true);
    const [showKD, setShowKD] = useState(true);
    const [showMACD, setShowMACD] = useState(true);
    const [showRSI, setShowRSI] = useState(true);
    const [showDMI, setShowDMI] = useState(true);

    // 各個 Series 的 Refs，以便單獨控制顯示/隱藏
    const maSeriesRef = useRef(null);
    const bbUpperSeriesRef = useRef(null);
    const bbMiddleSeriesRef = useRef(null);
    const bbLowerSeriesRef = useRef(null);
    const kSeriesRef = useRef(null);
    const dSeriesRef = useRef(null);
    const rsiSeriesRef = useRef(null);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        if (onPatternsDetected) {
            onPatternsDetected(detectedPatterns);
        }
    }, [detectedPatterns, onPatternsDetected]);

    useEffect(() => {
        if (!stock || !stock.symbol) return;

        let isMounted = true;

        const renderCharts = async () => {
            setLoading(true);
            try {
                let rawData = await getHistory(stock.symbol, 1000);
                if (!isMounted || !rawData.length) {
                    setLoading(false);
                    return;
                }

                // --- Data Aggregation ---
                const aggregateData = (data, p) => {
                    if (p === '日K') return data;
                    const result = [];
                    let current = null;

                    data.forEach((d) => {
                        const date = new Date(d.time);
                        let key;
                        if (p === '週K') {
                            const day = date.getDay();
                            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                            const monday = new Date(date);
                            monday.setDate(diff);
                            key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
                        } else {
                            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                        }

                        if (!current || current.time !== key) {
                            if (current) result.push(current);
                            current = {
                                time: key,
                                open: d.open,
                                high: d.high,
                                low: d.low,
                                close: d.close,
                                volume: Number(d.volume)
                            };
                        } else {
                            current.high = Math.max(current.high, d.high);
                            current.low = Math.min(current.low, d.low);
                            current.close = d.close;
                            current.volume += Number(d.volume);
                        }
                    });
                    if (current) result.push(current);
                    return result;
                };

                const processedData = aggregateData(rawData, period);

                const candleData = processedData.map(d => ({
                    time: d.time,
                    open: parseFloat(d.open),
                    high: parseFloat(d.high),
                    low: parseFloat(d.low),
                    close: parseFloat(d.close),
                }));

                const volumeData = processedData.map(d => ({
                    time: d.time,
                    value: Number(d.volume),
                    color: parseFloat(d.open) > parseFloat(d.close) ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'
                }));

                const closes = candleData.map(d => d.close);
                const opens = candleData.map(d => d.open);
                const highs = candleData.map(d => d.high);
                const lows = candleData.map(d => d.low);

                // --- Pattern Detection ---
                const markers = [];
                const recentPatterns = [];
                const RECENT_WINDOW = 20;

                const safeCheck = (fn, input) => {
                    try { return fn(input); } catch (e) { return false; }
                };

                if (candleData.length >= 5) {
                    for (let i = 4; i < candleData.length; i++) {
                        const input5 = {
                            open: opens.slice(i - 4, i + 1),
                            high: highs.slice(i - 4, i + 1),
                            low: lows.slice(i - 4, i + 1),
                            close: closes.slice(i - 4, i + 1)
                        };
                        const time = candleData[i].time;
                        const isRecent = i >= candleData.length - RECENT_WINDOW;

                        const patternsFound = [];
                        if (safeCheck(bullishengulfingpattern, input5)) patternsFound.push({ name: '吞噬型態', type: 'bullish' });
                        if (safeCheck(bearishengulfingpattern, input5)) patternsFound.push({ name: '空頭吞噬', type: 'bearish' });
                        if (safeCheck(bullishhammerstick, input5)) patternsFound.push({ name: '鎚子線', type: 'bullish' });
                        if (safeCheck(hangingman, input5)) patternsFound.push({ name: '上吊線', type: 'bearish' });
                        if (safeCheck(morningstar, input5)) patternsFound.push({ name: '晨星', type: 'bullish' });
                        if (safeCheck(eveningstar, input5)) patternsFound.push({ name: '夜星', type: 'bearish' });
                        if (safeCheck(threewhitesoldiers, input5)) patternsFound.push({ name: '紅三兵', type: 'bullish' });
                        if (safeCheck(threeblackcrows, input5)) patternsFound.push({ name: '三隻烏鴉', type: 'bearish' });
                        if (safeCheck(piercingline, input5)) patternsFound.push({ name: '貫穿/烏雲', type: 'neutral' });

                        patternsFound.forEach(p => {
                            if (p.type === 'bullish') {
                                markers.push({ time, position: 'belowBar', color: '#ef4444', shape: 'arrowUp', text: p.name });
                            } else if (p.type === 'bearish') {
                                markers.push({ time, position: 'aboveBar', color: '#22c55e', shape: 'arrowDown', text: p.name });
                            }
                            if (isRecent) {
                                const existingIdx = recentPatterns.findIndex(rp => rp.name === p.name);
                                if (existingIdx > -1) {
                                    recentPatterns[existingIdx].date = time;
                                } else {
                                    recentPatterns.push({ ...p, date: time });
                                }
                            }
                        });
                    }
                }
                setDetectedPatterns(recentPatterns);

                // --- Indicators Calculation ---
                // 1. MA20
                const ma20Data = [];
                if (closes.length >= 20) {
                    const ma20Result = SMA.calculate({ period: 20, values: closes });
                    const maOffset = closes.length - ma20Result.length;
                    for (let i = 0; i < ma20Result.length; i++) {
                        ma20Data.push({ time: candleData[i + maOffset].time, value: ma20Result[i] });
                    }
                }

                // 2. Bollinger Bands
                const bbData = { upper: [], middle: [], lower: [] };
                if (closes.length >= 20) {
                    const bbResult = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
                    const bbOffset = closes.length - bbResult.length;
                    for (let i = 0; i < bbResult.length; i++) {
                        const time = candleData[i + bbOffset].time;
                        bbData.upper.push({ time, value: bbResult[i].upper });
                        bbData.middle.push({ time, value: bbResult[i].middle });
                        bbData.lower.push({ time, value: bbResult[i].lower });
                    }
                }

                // 3. KD (Stochastic)
                const kdData = { k: [], d: [] };
                if (closes.length >= 9) {
                    const kdResult = Stochastic.calculate({
                        high: highs,
                        low: lows,
                        close: closes,
                        period: 9,
                        signalPeriod: 3
                    });
                    const kdOffset = closes.length - kdResult.length;
                    for (let i = 0; i < kdResult.length; i++) {
                        const time = candleData[i + kdOffset].time;
                        kdData.k.push({ time, value: kdResult[i].k });
                        kdData.d.push({ time, value: kdResult[i].d });
                    }
                }

                // 4. MACD
                const macdData = { macd: [], signal: [], histogram: [] };
                if (closes.length >= 26) {
                    const macdResult = MACD.calculate({
                        values: closes,
                        fastPeriod: 12,
                        slowPeriod: 26,
                        signalPeriod: 9,
                        SimpleMAOscillator: false,
                        SimpleMASignal: false
                    });
                    const macdOffset = closes.length - macdResult.length;
                    for (let i = 0; i < macdResult.length; i++) {
                        const time = candleData[i + macdOffset].time;
                        macdData.macd.push({ time, value: macdResult[i].MACD });
                        macdData.signal.push({ time, value: macdResult[i].signal });
                        macdData.histogram.push({
                            time,
                            value: macdResult[i].histogram,
                            color: macdResult[i].histogram >= 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'
                        });
                    }
                }

                // 5. RSI(14)
                const rsiData = [];
                if (closes.length >= 14) {
                    const rsiResult = RSI.calculate({ period: 14, values: closes });
                    const rsiOffset = closes.length - rsiResult.length;
                    for (let i = 0; i < rsiResult.length; i++) {
                        rsiData.push({ time: candleData[i + rsiOffset].time, value: rsiResult[i] });
                    }
                }

                // 6. DMI / ADX
                const dmiData = { pdi: [], mdi: [], adx: [] };
                if (closes.length >= 14) {
                    const adxResult = ADX.calculate({
                        high: highs,
                        low: lows,
                        close: closes,
                        period: 14
                    });
                    const adxOffset = closes.length - adxResult.length;
                    for (let i = 0; i < adxResult.length; i++) {
                        const time = candleData[i + adxOffset].time;
                        dmiData.pdi.push({ time, value: adxResult[i].pdi });
                        dmiData.mdi.push({ time, value: adxResult[i].mdi });
                        dmiData.adx.push({ time, value: adxResult[i].adx });
                    }
                }

                const lastIdx = candleData.length - 1;
                if (onIndicatorStatus && lastIdx >= 0) {
                    onIndicatorStatus({
                        rsi: rsiData.length ? rsiData[rsiData.length - 1].value : null,
                        macd: macdData.macd.length ? macdData.macd[macdData.macd.length - 1].value : null,
                        ma20: ma20Data.length ? ma20Data[ma20Data.length - 1].value : null,
                        close: candleData[lastIdx].close
                    });
                }

                // --- DOM Cleanup ---
                if (mainChartInstance.current) { mainChartInstance.current.remove(); mainChartInstance.current = null; }
                if (kdRsiChartInstance.current) { kdRsiChartInstance.current.remove(); kdRsiChartInstance.current = null; }
                if (macdChartInstance.current) { macdChartInstance.current.remove(); macdChartInstance.current = null; }
                if (dmiChartInstance.current) { dmiChartInstance.current.remove(); dmiChartInstance.current = null; }

                if (mainChartRef.current) mainChartRef.current.innerHTML = '';
                if (kdRsiChartRef.current) kdRsiChartRef.current.innerHTML = '';
                if (macdChartRef.current) macdChartRef.current.innerHTML = '';
                if (dmiChartRef.current) dmiChartRef.current.innerHTML = '';

                // --- Create Chart Options ---
                const commonOptions = {
                    layout: {
                        background: { type: 'solid', color: isDark ? '#0f172a' : '#ffffff' },
                        textColor: isDark ? '#94a3b8' : '#64748b',
                        fontSize: 10
                    },
                    grid: {
                        vertLines: { color: isDark ? '#1e293b' : '#f8fafc' },
                        horzLines: { color: isDark ? '#1e293b' : '#f8fafc' }
                    },
                    rightPriceScale: { borderColor: isDark ? '#1e293b' : '#f1f5f9', width: 60, borderVisible: false },
                    timeScale: { borderColor: isDark ? '#1e293b' : '#f1f5f9', borderVisible: false },
                    handleScroll: true,
                    handleScale: true,
                    crosshair: { mode: 1 },
                };

                if (!isMounted) return;

                // 1. Create Main Chart
                const mainChart = createChart(mainChartRef.current, { ...commonOptions, height: 260 });
                const candleSeries = mainChart.addSeries(CandlestickSeries, {
                    upColor: '#ef4444', downColor: '#22c55e', borderDownColor: '#22c55e',
                    borderUpColor: '#ef4444', wickDownColor: '#22c55e', wickUpColor: '#ef4444',
                });
                candleSeries.setData(candleData);
                if (markers.length > 0 && typeof candleSeries.setMarkers === 'function') {
                    candleSeries.setMarkers(markers);
                }

                // MA20 Series
                const maSeries = mainChart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'MA20' });
                maSeries.setData(ma20Data);
                maSeriesRef.current = maSeries;

                // BBands Series
                const bbUpperSeries = mainChart.addSeries(LineSeries, {
                    color: isDark ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.3)',
                    lineWidth: 1.5, title: 'BB Upper'
                });
                bbUpperSeries.setData(bbData.upper);
                bbUpperSeriesRef.current = bbUpperSeries;

                const bbMiddleSeries = mainChart.addSeries(LineSeries, {
                    color: isDark ? 'rgba(99, 102, 241, 0.65)' : 'rgba(99, 102, 241, 0.5)',
                    lineWidth: 1, lineStyle: 2, title: 'BB Middle'
                });
                bbMiddleSeries.setData(bbData.middle);
                bbMiddleSeriesRef.current = bbMiddleSeries;

                const bbLowerSeries = mainChart.addSeries(LineSeries, {
                    color: isDark ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.3)',
                    lineWidth: 1.5, title: 'BB Lower'
                });
                bbLowerSeries.setData(bbData.lower);
                bbLowerSeriesRef.current = bbLowerSeries;

                // Volume Series
                const volumeSeries = mainChart.addSeries(HistogramSeries, {
                    priceFormat: { type: 'volume' }, priceScaleId: '',
                    scaleMargins: { top: 0.8, bottom: 0 }
                });
                volumeSeries.setData(volumeData);

                // 2. Create KD & RSI Chart (Oscillators)
                const kdRsiChart = createChart(kdRsiChartRef.current, {
                    ...commonOptions,
                    height: 130,
                    timeScale: { ...commonOptions.timeScale, visible: false },
                });
                // K Series
                const kSeries = kdRsiChart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.5, title: 'K' });
                kSeries.setData(kdData.k);
                kSeriesRef.current = kSeries;
                // D Series
                const dSeries = kdRsiChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5, title: 'D' });
                dSeries.setData(kdData.d);
                dSeriesRef.current = dSeries;
                // RSI Series inside KD chart
                const rsiSeries = kdRsiChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1.5, title: 'RSI(14)' });
                rsiSeries.setData(rsiData);
                rsiSeriesRef.current = rsiSeries;

                // 80/20 Limits
                kSeries.createPriceLine({ price: 80, color: isDark ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5', lineWidth: 1, lineStyle: 2, title: '80/70' });
                kSeries.createPriceLine({ price: 20, color: isDark ? 'rgba(34, 197, 94, 0.4)' : '#86efac', lineWidth: 1, lineStyle: 2, title: '20/30' });

                // 3. Create MACD Chart
                const macdChart = createChart(macdChartRef.current, {
                    ...commonOptions,
                    height: 130,
                    timeScale: { ...commonOptions.timeScale, visible: false },
                });
                const macdLineSeries = macdChart.addSeries(LineSeries, { color: '#2563eb', lineWidth: 1.5, title: 'MACD' });
                macdLineSeries.setData(macdData.macd);
                const signalLineSeries = macdChart.addSeries(LineSeries, { color: '#f97316', lineWidth: 1.5, title: 'Signal' });
                signalLineSeries.setData(macdData.signal);
                const histSeries = macdChart.addSeries(HistogramSeries, { title: 'Hist' });
                histSeries.setData(macdData.histogram);

                // 4. Create DMI Chart (ADX)
                const dmiChart = createChart(dmiChartRef.current, {
                    ...commonOptions,
                    height: 140, // Slightly higher to accommodate timeScale labels at bottom
                    timeScale: { ...commonOptions.timeScale, visible: true }, // Keep timeScale visible at bottom
                });
                const pdiSeries = dmiChart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1.5, title: '+DI' });
                pdiSeries.setData(dmiData.pdi);
                const mdiSeries = dmiChart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 1.5, title: '-DI' });
                mdiSeries.setData(dmiData.mdi);
                const adxSeries = dmiChart.addSeries(LineSeries, { color: isDark ? '#94a3b8' : '#64748b', lineWidth: 1.5, title: 'ADX' });
                adxSeries.setData(dmiData.adx);

                // --- Sync Scrolling & Scaling ---
                const charts = [mainChart, kdRsiChart, macdChart, dmiChart];
                charts.forEach(c => {
                    c.timeScale().subscribeVisibleLogicalRangeChange(range => {
                        charts.filter(other => other !== c).forEach(other => {
                            other.timeScale().setVisibleLogicalRange(range);
                        });
                    });
                });

                mainChartInstance.current = mainChart;
                kdRsiChartInstance.current = kdRsiChart;
                macdChartInstance.current = macdChart;
                dmiChartInstance.current = dmiChart;

                const handleResize = () => {
                    const width = mainChartRef.current?.clientWidth;
                    if (width) {
                        mainChart.applyOptions({ width });
                        kdRsiChart.applyOptions({ width });
                        macdChart.applyOptions({ width });
                        dmiChart.applyOptions({ width });
                    }
                };
                window.addEventListener('resize', handleResize);

            } catch (err) {
                console.error('Render charts error:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        renderCharts();

        return () => {
            isMounted = false;
            if (mainChartInstance.current) { mainChartInstance.current.remove(); mainChartInstance.current = null; }
            if (kdRsiChartInstance.current) { kdRsiChartInstance.current.remove(); kdRsiChartInstance.current = null; }
            if (macdChartInstance.current) { macdChartInstance.current.remove(); macdChartInstance.current = null; }
            if (dmiChartInstance.current) { dmiChartInstance.current.remove(); dmiChartInstance.current = null; }

            if (mainChartRef.current) mainChartRef.current.innerHTML = '';
            if (kdRsiChartRef.current) kdRsiChartRef.current.innerHTML = '';
            if (macdChartRef.current) macdChartRef.current.innerHTML = '';
            if (dmiChartRef.current) dmiChartRef.current.innerHTML = '';
        };
    }, [stock, period, isDark]);

    // Separate effects for visibility toggles (prevents full chart re-creation)
    useEffect(() => {
        if (maSeriesRef.current) maSeriesRef.current.applyOptions({ visible: showMA20 });
    }, [showMA20]);

    useEffect(() => {
        if (bbUpperSeriesRef.current) bbUpperSeriesRef.current.applyOptions({ visible: showBB });
        if (bbMiddleSeriesRef.current) bbMiddleSeriesRef.current.applyOptions({ visible: showBB });
        if (bbLowerSeriesRef.current) bbLowerSeriesRef.current.applyOptions({ visible: showBB });
    }, [showBB]);

    useEffect(() => {
        if (kSeriesRef.current) kSeriesRef.current.applyOptions({ visible: showKD });
        if (dSeriesRef.current) dSeriesRef.current.applyOptions({ visible: showKD });
    }, [showKD]);

    useEffect(() => {
        if (rsiSeriesRef.current) rsiSeriesRef.current.applyOptions({ visible: showRSI });
    }, [showRSI]);

    if (!stock) return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 min-h-[500px]">
            <p className="font-bold text-lg text-slate-500 italic">Advanced Analytics Dashboard</p>
            <p className="text-sm mt-1">Select a stock to perform deep technical analysis</p>
        </div>
    );

    // kdRsiChart block visibility: if both KD and RSI are false, collapse the container
    const displayKdRsi = (showKD || showRSI) ? 'block' : 'none';

    return (
        <div className="w-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-brand-primary w-2 h-8 rounded-full shadow-sm shadow-brand-primary/20"></div>
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tight leading-none">
                            {stock.name} <span className="text-slate-400 dark:text-slate-500 font-bold ml-1 text-base">({stock.symbol})</span>
                        </h3>
                        {/* Custom Indicators Switches */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <button onClick={() => setShowMA20(v => !v)} className={`text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-tighter cursor-pointer transition-all border ${showMA20 ? 'text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400' : 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 line-through'}`}>MA20</button>
                            <button onClick={() => setShowBB(v => !v)} className={`text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-tighter cursor-pointer transition-all border ${showBB ? 'text-indigo-600 bg-indigo-100 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400' : 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 line-through'}`}>BB 布林通道</button>
                            <button onClick={() => setShowKD(v => !v)} className={`text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-tighter cursor-pointer transition-all border ${showKD ? 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400' : 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 line-through'}`}>KD 隨機</button>
                            <button onClick={() => setShowMACD(v => !v)} className={`text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-tighter cursor-pointer transition-all border ${showMACD ? 'text-orange-600 bg-orange-100 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-400' : 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 line-through'}`}>MACD</button>
                            <button onClick={() => setShowRSI(v => !v)} className={`text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-tighter cursor-pointer transition-all border ${showRSI ? 'text-purple-600 bg-purple-100 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-400' : 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 line-through'}`}>RSI 強弱</button>
                            <button onClick={() => setShowDMI(v => !v)} className={`text-xs md:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-tighter cursor-pointer transition-all border ${showDMI ? 'text-emerald-600 bg-emerald-100 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' : 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 line-through'}`}>DMI 趨勢</button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end self-end sm:self-center">
                    <div className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">
                        {stock.close_price ? parseFloat(stock.close_price).toFixed(2) : '--'}
                    </div>
                    <div className={`text-sm font-black flex items-center justify-end gap-1 ${stock.change_percent && parseFloat(stock.change_percent) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {stock.change_percent ? `${parseFloat(stock.change_percent) >= 0 ? '▲' : '▼'}${Math.abs(parseFloat(stock.change_percent)).toFixed(2)}%` : '--'}
                    </div>
                </div>
            </div>

            {/* Charts Container */}
            <div className="relative w-full p-4 space-y-4 bg-white/50 dark:bg-slate-900/50">
                {loading && (
                    <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center backdrop-blur-sm rounded-b-2xl">
                        <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-4 tracking-[0.3em] uppercase animate-pulse">Computing Integrated Charts...</span>
                    </div>
                )}

                {/* Patterns Detected Banner */}
                {detectedPatterns.length > 0 && (
                    <div className="flex items-center gap-3 bg-brand-primary/5 border border-brand-primary/10 dark:border-brand-primary/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight">K線型態偵測(近20日):</span>
                            {detectedPatterns.map((p, idx) => (
                                <span key={idx} className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${p.type === 'bullish' ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border-red-100 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-950/20 text-green-600 border-green-100 dark:border-green-900/30'}`}>
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {/* 1. Main Candlestick Chart */}
                    <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/10 dark:bg-slate-950/10">
                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <span className="text-xs md:text-sm font-black text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 uppercase tracking-tighter">Daily Candlestick (日K線 / 布林通道)</span>
                        </div>
                        <div ref={mainChartRef} className="w-full" />
                    </div>

                    {/* 2. KD & RSI Oscillator Chart */}
                    <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/10 dark:bg-slate-950/10" style={{ display: displayKdRsi }}>
                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <span className="text-xs md:text-sm font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50/90 dark:bg-slate-900/90 px-3 py-1 rounded-full border border-indigo-100 dark:border-slate-800 uppercase tracking-tighter">KD & RSI 擺動指標</span>
                        </div>
                        {/* Chart Legend info */}
                        <div className="absolute top-2 right-2 z-10 pointer-events-none flex gap-3 text-xs md:text-sm font-black">
                            {showKD && <span className="text-blue-500">K/D</span>}
                            {showRSI && <span className="text-purple-500">RSI(14)</span>}
                        </div>
                        <div ref={kdRsiChartRef} className="w-full" />
                    </div>

                    {/* 3. MACD Chart */}
                    <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/10 dark:bg-slate-950/10" style={{ display: showMACD ? 'block' : 'none' }}>
                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <span className="text-xs md:text-sm font-black text-orange-600 dark:text-orange-400 bg-orange-50/90 dark:bg-slate-900/90 px-3 py-1 rounded-full border border-orange-100 dark:border-slate-800 uppercase tracking-tighter">MACD (12, 26, 9)</span>
                        </div>
                        <div ref={macdChartRef} className="w-full" />
                    </div>

                    {/* 4. DMI Chart */}
                    <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/10 dark:bg-slate-950/10" style={{ display: showDMI ? 'block' : 'none' }}>
                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <span className="text-xs md:text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-slate-900/90 px-3 py-1 rounded-full border border-emerald-100 dark:border-slate-800 uppercase tracking-tighter">DMI / ADX 趨勢指標</span>
                        </div>
                        <div ref={dmiChartRef} className="w-full" />
                    </div>
                </div>
            </div>

            {/* Chart Footer Info */}
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between text-[10px] gap-2">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">K線/KD (9, 3)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">RSI (14)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">BB (20, 2)</span>
                    </div>
                </div>
                <div className="font-bold text-slate-400 dark:text-slate-500 italic tracking-tight text-left md:text-right">
                    多圖表聯動同步模式已啟用。拖曳或縮放任一圖表，所有指標將自動對齊時間軸。
                </div>
            </div>
        </div>
    );
}
