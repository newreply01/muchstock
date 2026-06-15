import React from 'react';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';
import StructuredReportView from '../shared/StructuredReportView';
import { useTheme } from '../../context/ThemeContext';

export default function AIAnalysisReport({ report, loading }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className={`h-full flex flex-col items-center justify-center space-y-4 rounded-2xl p-8 border border-dashed transition-colors ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}>
                <div className="relative">
                    <Bot className="w-12 h-12 animate-pulse" />
                    <Sparkles className="w-6 h-6 absolute -top-1 -right-1 text-brand-primary animate-bounce" />
                </div>
                <div className="text-center">
                    <p className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>AI 正在深度分析中...</p>
                    <p className="text-xs mt-1">彙整 技術面、籌碼面 與 盤勢新聞</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className={`h-full flex items-center justify-center font-medium border border-dashed rounded-2xl transition-colors ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400'
            }`}>
                請點擊右上角按鈕生成 AI 報告
            </div>
        );
    }

    return (
        <div className={`border rounded-2xl overflow-hidden shadow-sm h-full flex flex-col transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
        }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${
                isDark ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800/60 text-slate-800 dark:text-slate-100'
            }`}>
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-brand-primary" />
                    <span className={`font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>muchStock AI 分析報告</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sentiment Score:</span>
                    <div className={`px-2 py-0.5 rounded text-[11px] font-black ${(report.sentiment_score || 0.5) >= 0.5 ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'}`}>
                        {((report.sentiment_score || 0.5) * 10).toFixed(1)} / 10
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className={`p-6 md:p-8 flex-1 overflow-y-auto ${isDark ? 'bg-slate-950/20' : 'bg-slate-50/30'}`}>
                <div className="max-w-3xl mx-auto">
                    <StructuredReportView reportText={report.report} />

                    {report.is_fallback && (
                        <div className={`flex items-start gap-3 p-4 border rounded-xl text-xs font-bold leading-relaxed mt-5 ${
                            isDark ? 'bg-amber-950/20 border-amber-900/50 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>系統提示：目前環境尚未配置 Gemini AI 金鑰，報告係由本地量化規則引擎自動產出。</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-3 border-t flex justify-end transition-colors ${
                isDark ? 'bg-slate-950 border-slate-850' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}>
                <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>AI 生成內容僅供參考，不構成投資建議。</p>
            </div>
        </div>
    );
}
