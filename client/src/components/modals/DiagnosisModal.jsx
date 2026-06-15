import React, { useState, useEffect } from 'react';
import { 
    X, Brain, TrendingUp, TrendingDown, Target, Shield, 
    Zap, Activity, Info, AlertCircle, ChevronRight, Layout
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StructuredReportView from '../shared/StructuredReportView';

const API_BASE = '/api';

export default function DiagnosisModal({ isOpen, onClose, stock }) {
    const [reportData, setReportData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);

    // Visibility states for chart lines
    const [visibleLines, setVisibleLines] = useState({
        price: true,
        ma5: true,
        ma20: true,
        pressure: true,
        support: true
    });

    useEffect(() => {
        if (!isOpen || !stock) return;

        const fetchData = async () => {
            setLoading(true);
            setChartLoading(true);
            try {
                // Fetch AI Report
                const reportRes = await fetch(`${API_BASE}/stock/${stock.symbol}/ai-report`);
                const reportJson = await reportRes.json();
                if (reportJson.success) setReportData(reportJson.data);

                // Fetch Chart Data
                const chartRes = await fetch(`${API_BASE}/stock/${stock.symbol}/chart-data`);
                const chartJson = await chartRes.json();
                if (chartJson.success) setChartData(chartJson.data);
            } catch (err) {
                console.error('Failed to fetch diagnosis data:', err);
            } finally {
                setLoading(false);
                setChartLoading(false);
            }
        };

        fetchData();
    }, [isOpen, stock]);

    if (!isOpen || !stock) return null;

    const reportContent = reportData?.report || "目前尚無此個股的 AI 分析報告。";
    const sentimentLabel = reportData?.sentiment_score > 0.6 ? '正式看多' : reportData?.sentiment_score < 0.4 ? '正式看空' : '震盪盤整';
    const sentimentColor = reportData?.sentiment_score > 0.6 ? 'bg-emerald-500' : reportData?.sentiment_score < 0.4 ? 'bg-rose-500' : 'bg-orange-500';

    const toggleLine = (line) => {
        setVisibleLines(prev => ({ ...prev, [line]: !prev[line] }));
    };

    // Current levels from data (using first frame)
    const highLevel = chartData[0]?.high_target;
    const lowLevel = chartData[0]?.low_support;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            {/* Modal Content */}
            <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl shadow-md shadow-indigo-100">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">診斷報告：{stock.name} ({stock.symbol})</h2>
                                <span className={`${sentimentColor} text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm`}>
                                    AI 指標：{Math.round((reportData?.sentiment_score || 0.5) * 100)}分
                                </span>

                                <div className="relative group">
                                    <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-indigo-500 transition-colors" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-72 p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 border border-slate-700/50">
                                        <h4 className="text-xs font-black mb-2 text-indigo-300 tracking-widest uppercase text-center">📊 診斷指標說明</h4>
                                        <div className="space-y-2 text-[10px] leading-relaxed font-medium text-slate-200">
                                            <p><strong className="text-white">AI 健康評分</strong>：綜合籌碼、技術、基本面、新聞因子。80↑ 為多頭強勢；50-79 震盪；49↓ 弱勢危險。</p>
                                            <p><strong className="text-white">適合買進</strong>：股價站穩 MA20 月線 且 多因子評分 ≥ 2 分 (轉強信號)。</p>
                                            <p><strong className="text-white">考慮賣出</strong>：股價跌破 MA20 月線 且 多因子評分 ≤ -2 分 (轉弱避險)。</p>
                                            <p><strong className="text-white">量能異動</strong>：今日成交量 &gt; 5日均量 1.5 倍，代表資金進駐。</p>
                                            <p><strong className="text-white">RSI 指標</strong>：&gt;70 為超買區；&lt;30 為超跌區。</p>
                                            <p><strong className="text-white">布林 %b</strong>：判讀位階。&gt;1.0 突破上軌；&lt;0 跌破下軌；0.5 為布林中軌。</p>
                                        </div>
                                        {/* Triangle Tail */}
                                        <div className="absolute left-1/2 -translate-x-1/2 top-full border-8 border-transparent border-t-slate-900/95"></div>
                                    </div>
                                </div>
                                
                                {chartData.length > 0 && (
                                    <>
                                        {chartData[chartData.length-1].rsi && (
                                            <span className={`text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${
                                                chartData[chartData.length-1].rsi > 70 ? 'bg-rose-500' : 
                                                chartData[chartData.length-1].rsi < 30 ? 'bg-emerald-500' : 'bg-slate-600'
                                            }`}>
                                                RSI: {chartData[chartData.length-1].rsi}
                                            </span>
                                        )}
                                        {chartData[chartData.length-1].b_percent !== undefined && (
                                            <span className={`text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${
                                                chartData[chartData.length-1].b_percent > 0.8 ? 'bg-orange-500' : 
                                                chartData[chartData.length-1].b_percent < 0.2 ? 'bg-blue-500' : 'bg-indigo-600'
                                            }`}>
                                                %b: {chartData[chartData.length-1].b_percent}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">AI-Powered Strategic & Technical Analysis</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar-thin space-y-8">
                    
                    {/* Visual Trend Section */}
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-inner">
                         <div className="mb-6">
                            <div className="flex items-center gap-2 text-indigo-600 mb-4">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-black tracking-widest uppercase">近期走勢圖與支撐壓力 (近60日)</span>
                            </div>
                            
                            {/* Interactive Legend / Toggles */}
                            <div className="flex flex-wrap items-center gap-3">
                                <button 
                                    onClick={() => toggleLine('ma20')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${visibleLines.ma20 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 grayscale'}`}
                                >
                                    <div className="w-4 h-1 bg-emerald-500 rounded-full"></div>
                                    <span className="text-[10px] font-black tracking-tighter">MA20 (月線)</span>
                                </button>
                                <button 
                                    onClick={() => toggleLine('ma5')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${visibleLines.ma5 ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 grayscale'}`}
                                >
                                    <div className="w-4 h-1 bg-orange-500 rounded-full border-dashed border-t"></div>
                                    <span className="text-[10px] font-black tracking-tighter">MA5 (周線)</span>
                                </button>
                                <button 
                                    onClick={() => toggleLine('price')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${visibleLines.price ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 grayscale'}`}
                                >
                                    <div className="w-4 h-1 bg-indigo-500 rounded-full"></div>
                                    <span className="text-[10px] font-black tracking-tighter">收盤價</span>
                                </button>
                                <button 
                                    onClick={() => toggleLine('pressure')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${visibleLines.pressure ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 grayscale'}`}
                                >
                                    <div className="w-4 h-1 border-t-2 border-rose-400 border-dashed"></div>
                                    <span className="text-[10px] font-black tracking-tighter">壓力線(近20日高)</span>
                                </button>
                                <button 
                                    onClick={() => toggleLine('support')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${visibleLines.support ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 grayscale'}`}
                                >
                                    <div className="w-4 h-1 border-t-2 border-teal-400 border-dashed"></div>
                                    <span className="text-[10px] font-black tracking-tighter">支撐線(近20日低)</span>
                                </button>
                            </div>
                         </div>

                         <div className="h-[280px] w-full relative">
                            {chartLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                            minTickGap={20}
                                        />
                                        <YAxis 
                                            domain={['auto', 'auto']} 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                            orientation="left"
                                        />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                                            itemStyle={{ fontWeight: '900', padding: '2px 0' }}
                                            formatter={(value, name) => {
                                                if (name === 'high_target') return [value, '壓力線(近20日高)'];
                                                if (name === 'low_support') return [value, '支撐線(近20日低)'];
                                                if (name === 'price') return [value, '收盤價'];
                                                if (name === 'ma5') return [value, 'MA5(周線)'];
                                                if (name === 'ma20') return [value, 'MA20(月線)'];
                                                return [value, name];
                                            }}
                                        />
                                        
                                        {/* Rolling High/Low Lines */}
                                        {visibleLines.pressure && (
                                            <Area name="high_target" type="monotone" dataKey="high_target" stroke="#fb7185" strokeWidth={1} strokeDasharray="5 5" fill="none" connectNulls />
                                        )}
                                        {visibleLines.support && (
                                            <Area name="low_support" type="monotone" dataKey="low_support" stroke="#2dd4bf" strokeWidth={1} strokeDasharray="5 5" fill="none" connectNulls />
                                        )}

                                        {visibleLines.price && (
                                            <Area type="monotone" dataKey="price" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} connectNulls />
                                        )}
                                        {visibleLines.ma5 && (
                                            <Area type="monotone" dataKey="ma5" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} strokeDasharray="4 4" connectNulls />
                                        )}
                                        {visibleLines.ma20 && (
                                            <Area type="monotone" dataKey="ma20" stroke="#10b981" fillOpacity={0} strokeWidth={3} connectNulls />
                                        )}

                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                         </div>
                    </div>

                    {/* Real AI Report */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-600">
                            <div className="p-2 bg-indigo-50 rounded-xl">
                                <Brain className="w-5 h-5" />
                            </div>
                            <h4 className="font-black tracking-widest uppercase text-xs">AI 深度洞察與分析報告</h4>
                        </div>
                        
                        {loading ? (
                            <div className="flex flex-col items-center py-12 justify-center gap-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">正在解析報告...</span>
                            </div>
                        ) : (
                            <StructuredReportView reportText={reportContent} compact />
                        )}
                    </div>

                    {/* Basic Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-emerald-600">
                                <TrendingUp className="w-5 h-5" />
                                <h4 className="font-black tracking-widest uppercase text-xs">利多因素分析</h4>
                            </div>
                            <ul className="text-xs font-bold text-slate-600 space-y-3">
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                                    目前股價處於歷史相對低位，具備安全邊際。
                                </li>
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                                    法人連續買超，籌碼面結構逐漸轉強。
                                </li>
                            </ul>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-rose-600">
                                <TrendingDown className="w-5 h-5" />
                                <h4 className="font-black tracking-widest uppercase text-xs">潛在風險警告</h4>
                            </div>
                            <ul className="text-xs font-bold text-slate-600 space-y-3">
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-rose-400" />
                                    成交量尚未出現明顯爆發，需注意假突破風險。
                                </li>
                                <li className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-rose-400" />
                                    整體市場氣氛不穩定，建議嚴格執行停損。
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Target Prices */}
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-slate-400">
                            <Target className="w-4 h-4" />
                            <span className="text-xs font-black tracking-widest uppercase">AI 演算目標價設定</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-slate-900 dark:text-slate-50 font-black">
                             <div className="text-center p-4">
                                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">停利目標 1</div>
                                 <div className="text-2xl font-black text-emerald-600 tabular-nums">{stock.target1}</div>
                                 <div className="text-[10px] font-bold text-emerald-600/60 mt-1">預計獲利: +5.2%</div>
                             </div>
                             <div className="text-center p-4 border-x border-slate-100 dark:border-slate-800">
                                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">停利目標 2</div>
                                 <div className="text-2xl font-black text-emerald-500 tabular-nums">{stock.target2}</div>
                                 <div className="text-[10px] font-bold text-emerald-500/60 mt-1">預計獲利: +8.5%</div>
                             </div>
                             <div className="text-center p-4">
                                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">建議停損價</div>
                                 <div className="text-2xl font-black text-rose-500 tabular-nums">{stock.stopLoss}</div>
                                 <div className="text-[10px] font-bold text-rose-500/60 mt-1">最大風險: -3.8%</div>
                             </div>
                        </div>
                    </div>

                    {/* Footer Warning */}
                    <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                            本診斷評估內容係由 AI 根據技術面、籌碼面模型自動生成，並未考慮您的個人財務狀況。投資涉及風險，歷史表現不保證未來結果，請依照個人風險承受能力審慎評估。
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                    <button 
                        onClick={onClose}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50 px-12 py-3 rounded-2xl font-black tracking-widest shadow-sm transition-all uppercase text-xs active:scale-95"
                    >
                        返回看盤
                    </button>
                </div>
            </div>
        </div>
    );
}
