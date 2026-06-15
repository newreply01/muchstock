import React, { useEffect, useState } from 'react';
import { Bot, Sparkles, TrendingUp, TrendingDown, AlertCircle, RefreshCcw } from 'lucide-react';
import StructuredReportView from '../shared/StructuredReportView';
import { getAIReport, generateAIReport } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ─── Sentiment meter ────────────────────────────────────────────────
const Minus = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

function SentimentMeter({ score }) {
    const percentage = Math.max(0, Math.min(100, score * 100));
    let sentimentText = '中性觀望', sentimentColor = 'text-slate-500',
        bgGradient = 'from-slate-500/10 to-slate-400/5',
        progressGradient = 'from-slate-400 to-slate-500', Icon = Minus;

    if (score >= 0.7) { sentimentText = '強烈看多'; sentimentColor = 'text-red-600'; bgGradient = 'from-red-500/10 to-red-400/5'; progressGradient = 'from-red-400 to-red-600'; Icon = TrendingUp; }
    else if (score >= 0.55) { sentimentText = '偏向看多'; sentimentColor = 'text-red-500'; bgGradient = 'from-red-400/10 to-red-300/5'; progressGradient = 'from-red-300 to-red-500'; Icon = TrendingUp; }
    else if (score <= 0.3) { sentimentText = '強烈看空'; sentimentColor = 'text-green-600'; bgGradient = 'from-green-500/10 to-green-400/5'; progressGradient = 'from-green-400 to-green-600'; Icon = TrendingDown; }
    else if (score <= 0.45) { sentimentText = '偏向看空'; sentimentColor = 'text-green-500'; bgGradient = 'from-green-400/10 to-green-300/5'; progressGradient = 'from-green-300 to-green-500'; Icon = TrendingDown; }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-30`} />
            <div className="relative p-5 md:px-8 md:py-6 flex flex-col md:flex-row items-center gap-6 md:gap-12">
                <div className="flex flex-col items-center md:items-start min-w-[120px]">
                    <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">AI 綜合多空情緒</div>
                    <div className={`text-xl font-black ${sentimentColor} flex items-center gap-2 tracking-tight`}>
                        <Icon className="w-5 h-5" />{sentimentText}
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Market Sentiment Scale</span>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                            {(score * 100).toFixed(0)} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">/ 100</span>
                        </div>
                    </div>
                    <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/50 shadow-inner">
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-300/50 z-10" />
                        <div className={`h-full rounded-full bg-gradient-to-r ${progressGradient} transition-all duration-1000 ease-out shadow-sm`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400 px-1 uppercase tracking-widest">
                        <span>Extreme Fear</span><span>Neutral</span><span>Extreme Greed</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ─────────────────────────────────────────────────
export default function AIReportView({ symbol, name }) {
    const { user } = useAuth();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAIReport(symbol);
            if (data && data.success) {
                setReportData(data.data);
            } else {
                setReportData(null);
            }
        } catch (err) {
            console.error("AI 報告獲取失敗:", err);
            setError("無法獲取 AI 分析報告，請稍後再試。");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (symbol) fetchReport();
    }, [symbol]);

    const handleRegenerate = async () => {
        if (generating) return;
        setGenerating(true);
        try {
            const res = await generateAIReport(symbol);
            if (res.success) await fetchReport();
            else alert('生成失敗: ' + (res.error || '未知錯誤'));
        } catch (err) {
            console.error("生成報告出錯:", err);
            alert('發生錯誤: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2.5 rounded-xl border border-indigo-200 shadow-inner">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">AI 智能分析報告</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Generative AI Insights</p>
                    </div>
                </div>
                {user?.role === 'admin' && (
                    <button onClick={handleRegenerate} disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-600 text-xs font-black rounded-xl transition-all border border-indigo-100 shadow-sm">
                        <RefreshCcw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? '生成中...' : '重新生成報告'}
                    </button>
                )}
            </div>

            {/* States */}
            {loading ? (
                <div className="flex-1 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center min-h-[400px]">
                    <div className="w-16 h-16 relative mb-6">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                        <div className="relative z-10 w-16 h-16 bg-white dark:bg-slate-900 border-2 border-indigo-100 rounded-full flex items-center justify-center shadow-lg">
                            <Bot className="w-8 h-8 text-indigo-500 animate-pulse" />
                        </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-700 tracking-tight mb-2">正在分析海量市場數據...</h3>
                    <p className="text-sm font-medium text-slate-400 max-w-sm text-center">
                        AI 助手正在解讀 {name} ({symbol}) 的最新價量、籌碼流向與新聞資訊，請稍候。
                    </p>
                </div>
            ) : error ? (
                <div className="flex-1 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center items-center text-red-500 min-h-[400px]">
                    <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                    <p className="font-bold">{error}</p>
                </div>
            ) : reportData ? (
                <div className="flex flex-col gap-5 flex-1 overflow-y-auto">
                    {/* Sentiment meter */}
                    <SentimentMeter score={reportData.sentiment_score ?? 0.5} />

                    {reportData.is_fallback && (
                        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-800 text-xs font-bold leading-relaxed flex gap-3 shadow-inner">
                            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>目前系統未設定 API 金鑰，此報告為基於既有規則引擎所自動產生的標準化特徵摘要，非生成式 AI 結果。</div>
                        </div>
                    )}

                    {/* Structured report content */}
                    <StructuredReportView reportText={reportData.report} />

                    {/* Footer */}
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4">
                        <p className="text-[11px] font-bold text-slate-400 leading-relaxed text-center">
                            此報告由 AI 智能即時生成，綜合考量了歷史價量、三大法人動向及最新新聞。AI 生成內容僅供參考，不構成投資建議。
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
