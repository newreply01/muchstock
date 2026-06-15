import { useState, useEffect } from 'react';
import StockChart from '../charts/StockChart';
import ChipAnalysisChart from '../charts/ChipAnalysisChart';
import AIAnalysisReport from '../modals/AIAnalysisReport';
import StockSearchAutocomplete from '../forms/StockSearchAutocomplete';
import { getInstitutionalData, getAIReport, generateAIReport } from '../../utils/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TrendingUp, TrendingDown, Activity, FileText, Download, CheckCircle2, Circle, Search, Users, Bot, RefreshCw } from 'lucide-react';
import StockDetail from './StockDetail';

const CATEGORIES = [
    '總覽', '籌碼面', 'AI分析報告'
];

const PERIODS = ['日K', '週K', '月K'];

const CLASSIC_PATTERNS = [
    { id: 'red_three_soldiers', name: '紅三兵', type: 'bullish', en: 'Red Three Soldiers', desc: '連續三天收紅K，顯示多頭強勢' },
    { id: 'three_black_crows', name: '三隻烏鴉', type: 'bearish', en: 'Three Black Crows', desc: '連續三天收黑K，顯示空頭強勢' },
    { id: 'morning_star', name: '晨星', type: 'bullish', en: 'Morning Star', desc: '跌勢末端出現轉折，可能反轉向上' },
    { id: 'evening_star', name: '夜星', type: 'bearish', en: 'Evening Star', desc: '漲勢末端出現轉折，可能反轉向下' },
    { id: 'bullish_engulfing', name: '吞噬型態', type: 'bullish', en: 'Bullish Engulfing', desc: '陽線完全包覆前一陰線，強烈看漲' },
    { id: 'bearish_engulfing', name: '空頭吞噬', type: 'bearish', en: 'Bearish Engulfing', desc: '陰線完全包覆前一陽線，強烈看跌' },
    { id: 'piercing_line', name: '貫穿/烏雲', type: 'neutral', en: 'Piercing/Dark Cloud', desc: '穿透前日陰線實體中點以上' },
    { id: 'hammer', name: '鎚子線', type: 'bullish', en: 'Hammer', desc: '長下影線實體小，底部反轉訊號' },
    { id: 'inverted_hammer', name: '倒鎚子', type: 'bullish', en: 'Inverted Hammer', desc: '長上影線實體小，通常出現在底部' },
    { id: 'hanging_man', name: '上吊線', type: 'bearish', en: 'Hanging Man', desc: '高檔出現的長下影線，警示訊號' },
    { id: 'shooting_star', name: '射擊之星', type: 'bearish', en: 'Shooting Star', desc: '高檔出現的長上影線，可能見頂' },
    { id: 'three_inside_up', name: '三內升', type: 'bullish', en: 'Three Inside Up', desc: '母子型態後隔日收高，多頭確認' },
    { id: 'three_inside_down', name: '三內降', type: 'bearish', en: 'Three Inside Down', desc: '母子型態後隔日收低，空頭確認' },
];

export default function PatternAnalysisDashboard({
    children,
    selectedStock,
    activePatterns = [],
    onPatternsChange,
    onStockSelect
}) {
    const [activeCategory, setActiveCategory] = useState('總覽');
    const [activePeriod, setActivePeriod] = useState('日K');
    const [activeFilter, setActiveFilter] = useState('all'); // all, bullish, bearish
    const [indicatorStatus, setIndicatorStatus] = useState({ rsi: null, macd: null, ma20: null, close: null });

    const [institutionalData, setInstitutionalData] = useState([]);
    const [loadingChip, setLoadingChip] = useState(false);

    const [aiReport, setAiReport] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        if (selectedStock?.symbol && activeCategory === '籌碼面') {
            setLoadingChip(true);
            getInstitutionalData(selectedStock.symbol)
                .then(setInstitutionalData)
                .catch(err => console.error('Chip fetch failed:', err))
                .finally(() => setLoadingChip(false));
        }

        if (selectedStock?.symbol && activeCategory === 'AI分析報告' && !aiReport) {
            handleGenerateAI();
        }
    }, [selectedStock, activeCategory]);


    const handleGenerateAI = (isRegenerate = false) => {
        if (!selectedStock?.symbol) return;
        setLoadingAI(true);
        
        const apiCall = isRegenerate ? generateAIReport(selectedStock.symbol) : getAIReport(selectedStock.symbol);
        
        apiCall
            .then(res => {
                // 回傳格式可能包含在 res.data 中
                setAiReport(res.data || res);
            })
            .catch(err => {
                console.error('AI fetch failed:', err);
                alert(`發生錯誤：${err.message || '連線至 AI 伺服器失敗'}`);
            })
            .finally(() => setLoadingAI(false));
    };

    const handleExportExcel = () => {
        if (!selectedStock) return;
        const data = [
            { '股票代號': selectedStock.symbol, '股票名稱': selectedStock.name, '產業': selectedStock.industry, '當天收盤': indicatorStatus.close, 'RSI': indicatorStatus.rsi?.toFixed(2), 'EMA方向': indicatorStatus.close > indicatorStatus.ma20 ? '多頭' : '空頭' },
            { '型態名稱': '偵測型態', '狀態': activePatterns.map(p => p.name).join(', ') }
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Analysis");
        XLSX.writeFile(wb, `${selectedStock.symbol}_analysis.xlsx`);
    };

    const handleExportPDF = async () => {
        const element = document.body; // Export entire page or specific ref
        const canvas = await html2canvas(element);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${selectedStock?.symbol || 'dashboard'}_report.pdf`);
    };

    // Real pattern counting for the selected stock
    const bullishCount = activePatterns.filter(p => p.type === 'bullish').length;
    const bearishCount = activePatterns.filter(p => p.type === 'bearish').length;

    return (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
            {/* ... Navigation ... */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="flex overflow-x-auto no-scrollbar py-3 px-2 border-b border-gray-100">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => {
                                console.log('Dashboard: Category clicked:', cat);
                                setActiveCategory(cat);
                            }}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-colors mx-1 ${activeCategory === cat
                                ? 'bg-brand-primary text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50/50">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm mb-4 sm:mb-0">
                        {PERIODS.map(p => (
                            <button
                                key={p}
                                onClick={() => {
                                    console.log('Dashboard: Period clicked:', p);
                                    setActivePeriod(p);
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activePeriod === p
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('muchstock-view', { detail: 'institutional' }))}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white dark:bg-slate-900 text-gray-700 rounded-lg text-sm font-semibold hover:border-gray-400 hover:shadow-sm transition-all focus:outline-none"
                        >
                            <Activity className="w-4 h-4 text-brand-primary" /> 多股比較
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white dark:bg-slate-900 text-gray-700 rounded-lg text-sm font-semibold hover:border-gray-400 hover:shadow-sm transition-all focus:outline-none"
                        >
                            <FileText className="w-4 h-4 text-red-500" /> 匯出 PDF
                        </button>
                        <button
                            onClick={(e) => {
                                console.log('Dashboard: Export Excel clicked');
                                handleExportExcel();
                            }}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white dark:bg-slate-900 text-gray-700 rounded-lg text-sm font-semibold hover:border-gray-400 hover:shadow-sm transition-all focus:outline-none"
                        >
                            <Download className="w-4 h-4 text-green-600" /> 匯出 Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Summary Cards (Real Counts for Selected Stock) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { id: 'bullish', label: '看漲型態偵測', count: bullishCount, icon: TrendingUp, color: 'text-red-500', activeBg: 'bg-red-50 border-red-200 ring-1 ring-red-500', countBg: bullishCount > 0 ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400' },
                    { id: 'bearish', label: '看跌型態偵測', count: bearishCount, icon: TrendingDown, color: 'text-green-600', activeBg: 'bg-green-50 border-green-200 ring-1 ring-green-600', countBg: bearishCount > 0 ? 'bg-green-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400' },
                    { id: 'status', label: '技術指標狀態', count: 'Active', icon: Activity, color: 'text-blue-500', activeBg: 'bg-blue-50 border-blue-200', countBg: 'bg-blue-100 text-blue-700' },
                ].map(card => (
                    <div
                        key={card.id}
                        onClick={() => {
                            console.log('Dashboard: Filter card clicked:', card.id);
                            setActiveFilter(prev => prev === card.id ? 'all' : card.id);
                        }}
                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${activeFilter === card.id ? card.activeBg : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-sm'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Stock Analysis</span>
                                <span className="font-black text-slate-800 dark:text-slate-100 text-base">{card.label}</span>
                            </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${card.countBg} shadow-sm`}>
                            {card.id === 'status' ? (
                                <div className="flex items-center gap-2 text-[10px]">
                                    <span className={indicatorStatus.rsi > 70 ? 'text-red-500' : indicatorStatus.rsi < 30 ? 'text-green-500' : ''}>RSI:{indicatorStatus.rsi?.toFixed(0) || '--'}</span>
                                    <span className={indicatorStatus.close > indicatorStatus.ma20 ? 'text-red-500' : 'text-green-500'}>MA:{indicatorStatus.close > indicatorStatus.ma20 ? '多' : '空'}</span>
                                </div>
                            ) : card.count}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-6">
                {activeCategory === '籌碼面' ? (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Users className="text-brand-primary w-6 h-6" />
                                    三大法人買賣超趨勢
                                </h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Institutional Ownership Trend (60D)</p>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            {loadingChip ? (
                                <div className="h-full flex items-center justify-center text-slate-400">
                                    <Activity className="w-8 h-8 animate-spin mr-2" />
                                    載入籌碼數據中...
                                </div>
                            ) : (
                                <ChipAnalysisChart data={institutionalData} />
                            )}
                        </div>
                    </div>
                ) : activeCategory === 'AI分析報告' ? (
                    <div className="h-[600px] flex flex-col gap-4">
                        <div className="flex justify-end">
                            <button
                                onClick={() => handleGenerateAI(true)}
                                disabled={loadingAI}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingAI ? 'animate-spin' : ''}`} />
                                {loadingAI ? '生成中...' : '重新生成分析報告'}
                            </button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <AIAnalysisReport report={aiReport} loading={loadingAI} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Search className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1">
                                <StockSearchAutocomplete
                                    onSelectStock={(stock) => {
                                        if (onStockSelect) {
                                            onStockSelect(stock);
                                        }
                                    }}
                                />
                            </div>
                            <p className="text-xs text-slate-400 font-bold hidden sm:block">輸入代號快速分析特定標的</p>
                        </div>
                        <StockChart
                            stock={selectedStock}
                            period={activePeriod}
                            onPatternsDetected={onPatternsChange}
                            onIndicatorStatus={setIndicatorStatus}
                        />
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl p-6 min-h-[400px] flex flex-col">
                    {children ? children : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-800">
                            <Activity className="w-12 h-12 mb-3 text-gray-300" />
                            <p className="font-medium text-lg text-gray-500">K線圖表區塊 / 數據表格 (開發中)</p>
                            <p className="text-sm mt-1">選中【{activeCategory}】與【{activePeriod}】資料渲染處</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                        <Search className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">經典多日型態比對</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {CLASSIC_PATTERNS.filter(p => {
                        if (activeFilter === 'bullish') return activePatterns.some(ap => ap.name === p.name && ap.type === 'bullish');
                        if (activeFilter === 'bearish') return activePatterns.some(ap => ap.name === p.name && ap.type === 'bearish');
                        return true;
                    }).map(pat => {
                        const isDetected = activePatterns.some(p => p.name === pat.name);
                        const colorTheme = pat.type === 'bullish' ? {
                            border: 'border-red-500 ring-1 ring-red-500/20',
                            text: 'text-red-500',
                            bg: 'bg-red-500'
                        } : pat.type === 'bearish' ? {
                            border: 'border-green-600 ring-1 ring-green-600/20',
                            text: 'text-green-600',
                            bg: 'bg-green-600'
                        } : { // neutral
                            border: 'border-blue-500 ring-1 ring-blue-500/20',
                            text: 'text-blue-500',
                            bg: 'bg-blue-500'
                        };

                        return (
                            <div key={pat.id} className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all relative overflow-hidden group shadow-sm ${isDetected ? colorTheme.border : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className={`font-black text-lg leading-tight transition-colors ${isDetected ? colorTheme.text : 'text-slate-800 dark:text-slate-100'}`}>
                                            {pat.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{pat.en}</p>
                                    </div>
                                    {isDetected ? (
                                        <div className={`flex items-center gap-1.5 text-[10px] font-black text-white ${colorTheme.bg} px-2.5 py-1 rounded-full shadow-sm`}>
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>ACTIVE</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                                            <Circle className="w-3 h-3" />
                                            <span>INACTIVE</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{pat.desc}</p>
                                {isDetected && (
                                    <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.04] pointer-events-none transition-transform group-hover:scale-110 ${colorTheme.bg}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
