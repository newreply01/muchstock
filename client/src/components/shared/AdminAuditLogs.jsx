import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, Activity, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { authFetch } from '../../utils/auth';

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const limit = 50;

    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [expandedLog, setExpandedLog] = useState(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                limit,
                offset: page * limit,
                action: filterAction,
                user_id: filterUser
            });
            const res = await authFetch(`/api/admin/audit-logs?${query.toString()}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filterAction, filterUser]);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const getActionColor = (action) => {
        if (action.includes('LOGIN')) return 'bg-blue-100 text-blue-700';
        if (action.includes('UPDATE_USER')) return 'bg-purple-100 text-purple-700';
        if (action.includes('REGISTER')) return 'bg-green-100 text-green-700';
        if (action.includes('REMOVE')) return 'bg-red-100 text-red-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-primary" />
                    <h2 className="text-xl font-bold text-slate-800">系統操作軌跡紀錄</h2>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select 
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                    >
                        <option value="">所有動作</option>
                        <option value="USER_LOGIN">登入 (Email)</option>
                        <option value="USER_LOGIN_GOOGLE">登入 (Google)</option>
                        <option value="USER_REGISTER">註冊</option>
                        <option value="UPDATE_USER">管理員修改使用者</option>
                        <option value="UPDATE_PROFILE">使用者修改個資</option>
                        <option value="WATCHLIST_ADD">加入自選</option>
                        <option value="WATCHLIST_REMOVE">移除自選</option>
                    </select>
                    
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="使用者 UUID 篩選..."
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-full md:w-48 outline-none focus:ring-2 focus:ring-brand-primary/20"
                            value={filterUser}
                            onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-tighter">時間</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-tighter">使用者</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-tighter">動作</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-tighter">對象</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-tighter">IP 位址</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-tighter text-right">詳情</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">尚無符合條件的軌跡紀錄</td>
                                </tr>
                            ) : logs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600 font-mono whitespace-nowrap">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800">{log.user_nickname || 'Unknown'}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{log.user_email || log.user_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.target_type}</span>
                                                <span className="text-xs font-mono text-slate-600">{log.target_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                            {log.ip_address || '--'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
                                            >
                                                {expandedLog === log.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedLog === log.id && (
                                        <tr className="bg-slate-50/50">
                                            <td colSpan="6" className="px-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">操作詳情 (Details)</h4>
                                                        <pre className="text-xs bg-white p-3 rounded-lg border border-slate-200 overflow-auto max-h-48 font-mono">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">環境資料 (Environment)</h4>
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-500 break-all h-fit">
                                                            <p className="mb-1"><strong>User Agent:</strong></p>
                                                            {log.user_agent}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
                    <span>總共 {total} 筆紀錄</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-50 transition-colors"
                        >
                            上一頁
                        </button>
                        <button 
                            disabled={(page + 1) * limit >= total}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-50 transition-colors"
                        >
                            下一頁
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAuditLogs;
