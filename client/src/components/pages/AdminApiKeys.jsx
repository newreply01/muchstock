import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Lightbulb, Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { authFetch } from '../../utils/auth';
import { API_BASE } from '../../utils/api';

export default function AdminApiKeys() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    
    // Inline Add Form
    const [formData, setFormData] = useState({ service_name: '', api_key: '', description: '', is_active: true });
    
    const [revealedKeys, setRevealedKeys] = useState(new Set());
    const [copiedKey, setCopiedKey] = useState(null);

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/admin/api-keys`);
            const data = await res.json();
            if (data.success) {
                setKeys(data.apiKeys);
            }
        } catch (err) {
            console.error('Fetch keys error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.service_name || !formData.api_key) return;
        setSubmitLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/admin/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setFormData({ service_name: '', api_key: '', description: '', is_active: true });
                await fetchKeys();
            } else {
                alert(data.error || '新增失敗');
            }
        } catch (err) {
            alert('網路錯誤');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id, serviceName) => {
        if (!window.confirm(`確定要刪除 ${serviceName} 嗎？此操作無法復原。`)) return;
        
        try {
            const res = await authFetch(`${API_BASE}/admin/api-keys/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setKeys(prev => prev.filter(k => k.id !== id));
            } else {
                alert(data.error || '刪除失敗');
            }
        } catch (err) {
            alert('網路錯誤');
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const res = await authFetch(`${API_BASE}/admin/api-keys/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            const data = await res.json();
            if (data.success) {
                setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: !currentStatus } : k));
            }
        } catch (err) {
            console.error('Status update error:', err);
        }
    };

    const maskKey = (key, id) => {
        if (!key) return '—';
        if (revealedKeys.has(id)) return key;
        
        if (key.length <= 10) return '*'.repeat(key.length);
        return `${key.substring(0, 6)}...${key.substring(key.length - 5)}`;
    };

    const toggleReveal = (id) => {
        setRevealedKeys(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const copyToClipboard = async (id, key) => {
        try {
            await navigator.clipboard.writeText(key);
            setCopiedKey(id);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (err) {
            alert('複製失敗');
        }
    };

    const activeCount = keys.filter(k => k.is_active).length;

    return (
        <div className="bg-[#fcfaf8] rounded-2xl p-6 min-h-[500px]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-dashed border-amber-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                    <span>🔑</span> API Key 動態配置與健康度監控
                </h2>
                <div className="text-sm text-amber-800 font-medium">
                    目前啟用：{activeCount} / {keys.length}
                </div>
            </div>

            {/* Add Section */}
            <div className="bg-white border border-amber-100 rounded-xl shadow-sm p-6 mb-8 flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                    <h3 className="text-amber-900 font-bold flex items-center gap-2 mb-4">
                        <Plus className="w-5 h-5 text-indigo-500" />
                        新增 API 金鑰
                    </h3>
                    <form onSubmit={handleAdd} className="flex gap-3">
                        <input 
                            type="text" 
                            required
                            placeholder="服務名稱 (如: openai)"
                            value={formData.service_name}
                            onChange={(e) => setFormData({...formData, service_name: e.target.value})}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all text-slate-700"
                        />
                        <input 
                            type="text" 
                            required
                            placeholder="輸入 API_KEY..."
                            value={formData.api_key}
                            onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                            className="flex-[2] bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all text-slate-700 font-mono"
                        />
                        <button 
                            type="submit"
                            disabled={submitLoading}
                            className="bg-white border border-amber-600 text-amber-700 px-6 py-2 rounded-full font-bold text-sm hover:bg-amber-50 transition-colors flex items-center justify-center min-w-[100px]"
                        >
                            {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '新增金鑰'}
                        </button>
                    </form>
                </div>
                
                <div className="hidden lg:block w-px bg-amber-100"></div>
                
                <div className="flex-1 text-sm text-amber-800/80">
                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        運維提示：
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>系統採用動態讀取機制。新增金鑰後將即時生效供系統取用。</li>
                        <li>點擊狀態標籤可即時「<strong className="text-amber-900">啟用/停用</strong>」特定 Key。</li>
                    </ul>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-amber-100">
                            <th className="py-3 px-4 text-xs font-bold text-amber-900">說明/來源</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900">遮罩金鑰</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900">狀態</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900 text-center">調用次數</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900 text-center">成功率</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900 text-center">平均延遲</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900 text-center">429 錯誤次數</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900">最後更新時間</th>
                            <th className="py-3 px-4 text-xs font-bold text-amber-900 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="9" className="py-12 text-center text-amber-600">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : keys.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="py-12 text-center text-slate-400 text-sm">
                                    尚無 API 金鑰資料
                                </td>
                            </tr>
                        ) : (
                            keys.map(k => (
                                <tr key={k.id} className="border-b border-slate-100 hover:bg-amber-50/50 transition-colors group">
                                    <td className="py-4 px-4 text-sm text-slate-700 font-medium">{k.service_name}</td>
                                    <td className="py-4 px-4 text-sm font-mono text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate max-w-[200px] inline-block" title={k.api_key}>
                                                {maskKey(k.api_key, k.id)}
                                            </span>
                                            {k.api_key && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => toggleReveal(k.id)} 
                                                        className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                                                        title={revealedKeys.has(k.id) ? "隱藏金鑰" : "顯示金鑰"}
                                                    >
                                                        {revealedKeys.has(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => copyToClipboard(k.id, k.api_key)} 
                                                        className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                                                        title="複製金鑰"
                                                    >
                                                        {copiedKey === k.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <button 
                                            onClick={() => toggleStatus(k.id, k.is_active)}
                                            className={`text-[11px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                                                k.is_active 
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${k.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                            {k.is_active ? '啟用中' : '已停用'}
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-center text-slate-500">{k.invoke_count || 0}</td>
                                    <td className="py-4 px-4 text-sm text-center text-slate-500 font-medium">{k.invoke_count > 0 ? ((k.success_count / k.invoke_count) * 100).toFixed(1) + '%' : '—'}</td>
                                    <td className="py-4 px-4 text-sm text-center text-slate-500">{k.invoke_count > 0 ? Math.round(k.total_latency_ms / k.invoke_count) + ' ms' : '—'}</td>
                                    <td className="py-4 px-4 text-sm text-center text-slate-500">{k.error_429_count || 0}</td>
                                    <td className="py-4 px-4 text-sm text-slate-500">{new Date(k.updated_at).toLocaleString()}</td>
                                    <td className="py-4 px-4 text-right">
                                        <button 
                                            onClick={() => handleDelete(k.id, k.service_name)}
                                            className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center justify-end gap-1 w-full font-medium"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> 刪除
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
