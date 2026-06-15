import React, { useState, useEffect } from 'react';
import { Save, History, Check, AlertCircle, RefreshCcw, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { getPromptTemplate, updatePromptTemplate, getPromptHistory, getPromptVersion, deletePromptVersion, overwritePromptVersion } from '../../utils/api';

export default function AIPromptManager() {
    const [templateName, setTemplateName] = useState('stock_analysis_report');
    const [content, setContent] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeVersion, setActiveVersion] = useState(null);
    const [viewingVersion, setViewingVersion] = useState(null);
    const [viewingVersionId, setViewingVersionId] = useState(null);
    const [note, setNote] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [templateRes, historyRes] = await Promise.all([
                getPromptTemplate(templateName),
                getPromptHistory(templateName)
            ]);

            let loadedVersion = null;
            if (historyRes.success && historyRes.data.length > 0) {
                const latestId = historyRes.data[0].id;
                const latestRes = await getPromptVersion(latestId);
                if (latestRes.success) {
                    loadedVersion = latestRes.data;
                }
            }
            if (!loadedVersion && templateRes.success) {
                loadedVersion = templateRes.data;
            }
            
            if (loadedVersion) {
                setContent(loadedVersion.content);
                setNote(loadedVersion.note || '');
                setViewingVersion(loadedVersion.version);
                setViewingVersionId(loadedVersion.id);
            }

            if (templateRes.success) {
                setActiveVersion(templateRes.data.version);
            }
            if (historyRes.success) {
                setHistory(historyRes.data);
            }
        } catch (err) {
            console.error('Failed to fetch prompt data:', err);
            setMessage({ type: 'error', text: '獲取資料失敗' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [templateName]);

    const handleSave = async () => {
        if (!content.trim()) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await updatePromptTemplate(templateName, content, note);
            if (res.success) {
                setMessage({ type: 'success', text: `成功儲存新版本 (v${res.data.version})` });
                setNote(''); // Clear note after new version
                fetchData();
            }
        } catch (err) {
            setMessage({ type: 'error', text: '儲存失敗' });
        } finally {
            setSaving(false);
        }
    };

    const handleViewVersion = async (versionId) => {
        setLoading(true);
        try {
            const res = await getPromptVersion(versionId);
            if (res.success) {
                setContent(res.data.content);
                setNote(res.data.note || '');
                setViewingVersion(res.data.version);
                setViewingVersionId(res.data.id);
                setMessage({ type: 'info', text: `正在預覽版本 v${res.data.version} (未儲存)` });
            }
        } catch (err) {
            setMessage({ type: 'error', text: '獲取版本內容失敗' });
        } finally {
            setLoading(false);
        }
    };
    const handleOverwrite = async () => {
        if (!content.trim() || !viewingVersionId) return;
        if (!window.confirm('確定要直接覆蓋此版本內容嗎？此動作將修改歷史紀錄。')) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await overwritePromptVersion(viewingVersionId, content, note);
            if (res.success) {
                setMessage({ type: 'success', text: `成功覆蓋版本 (v${viewingVersion})${note ? ' 並更新備註' : ''}` });
                fetchData();
            } else {
                setMessage({ type: 'error', text: res.message || '覆蓋失敗' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || '覆蓋失敗' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVersion = async (e, versionId) => {
        e.stopPropagation();
        if (!window.confirm('確定要刪除此版本嗎？(刪除後無法恢復)')) return;
        setLoading(true);
        try {
            const res = await deletePromptVersion(versionId);
            if (res.success) {
                setMessage({ type: 'success', text: `已成功刪除舊版本` });
                fetchData();
            } else {
                setMessage({ type: 'error', text: res.message || '刪除失敗' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || '刪除失敗' });
        } finally {
            setLoading(false);
        }
    };

    if (loading && !content) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {/* Main Editor */}
            <div className="lg:col-span-3 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-lg">
                                <FileText className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">AI 提示詞編輯器</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Template: {templateName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {viewingVersion !== activeVersion && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded border border-amber-200 uppercase tracking-wider">
                                    預覽版本 v{viewingVersion}
                                </span>
                            )}
                            <button
                                onClick={handleOverwrite}
                                disabled={saving || !viewingVersionId}
                                title="直接覆蓋目前正在編輯的版本"
                                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 disabled:opacity-50 text-sm font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all"
                            >
                                {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-500" />}
                                覆蓋目前版本
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                title="將目前的內容發佈為全新的版本並生效"
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all"
                            >
                                {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                儲存為新版本
                            </button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">版本備註:</span>
                        <input 
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="輸入此版本的變動說明或主題 (例如：優化法人分析邏輯)..."
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-sm text-slate-700 font-bold"
                        />
                    </div>
                    
                    <div className="flex-1 p-0 relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full p-6 text-slate-700 font-mono text-sm leading-relaxed focus:outline-none resize-none bg-slate-50/30"
                            placeholder="在這裡輸入 AI 提示詞模板..."
                        />
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
                        message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 
                        message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 
                        'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                        {message.type === 'success' ? <Check className="w-5 h-5" /> : 
                         message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
                         <RefreshCcw className="w-5 h-5" />}
                        <span className="text-sm font-bold">{message.text}</span>
                    </div>
                )}
            </div>

            {/* Version History Sidebar */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[600px]">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-black text-slate-700">版本歷史</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-3 space-y-2">
                        {history.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleViewVersion(item.id)}
                                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                                    viewingVersion === item.version 
                                        ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-100 hover:bg-slate-50 dark:bg-slate-800'
                                }`}
                            >
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black ${viewingVersion === item.version ? 'text-indigo-600' : 'text-slate-700'}`}>
                                            版本 v{item.version}
                                        </span>
                                        {item.is_active && (
                                            <span className="bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-green-200 uppercase tracking-tighter">
                                                使用中
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                        {new Date(item.created_at).toLocaleString('zh-TW', { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </span>
                                    {item.note && (
                                        <span className="text-[10px] text-slate-600 font-bold block truncate max-w-[150px]" title={item.note}>
                                            📝 {item.note}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 relative z-10">
                                    {!item.is_active && (
                                        <button 
                                            onClick={(e) => handleDeleteVersion(e, item.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="刪除這個版本"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${viewingVersion === item.version ? 'text-indigo-500' : 'text-slate-300'}`} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
