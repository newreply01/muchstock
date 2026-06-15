import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/auth';
import { 
    Users, Search, Shield, User, Clock, 
    MoreHorizontal, ChevronRight, X, ExternalLink, 
    CheckCircle2, AlertCircle, Trash2, Ban, Activity
} from 'lucide-react';

import AdminAuditLogs from '../shared/AdminAuditLogs';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function AdminUserManagement() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'logs'
    
    // 使用者列表相關狀態
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const limit = 20;

    // 詳情面板狀態
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPortfolio, setUserPortfolio] = useState([]);
    const [portfolioLoading, setPortfolioLoading] = useState(false);

    // 編輯與操作狀態
    const [editStatus, setEditStatus] = useState({ type: '', message: '' });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                search,
                role: roleFilter,
                limit,
                offset: page * limit
            });
            const res = await authFetch(`${API_BASE}/admin/users?${params}`);
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
                setTotal(data.total);
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, page]);

    useEffect(() => {
        if (currentUser?.role === 'admin' && activeTab === 'users') {
            fetchUsers();
        }
    }, [fetchUsers, currentUser, activeTab]);

    const handleViewUserDetail = async (user) => {
        setSelectedUser(user);
        setPortfolioLoading(true);
        setUserPortfolio([]);
        try {
            const res = await authFetch(`${API_BASE}/admin/users/${user.id}/portfolio`);
            const data = await res.json();
            if (data.success) {
                setUserPortfolio(data.watchlists);
            }
        } catch (err) {
            console.error('Fetch portfolio error:', err);
        } finally {
            setPortfolioLoading(false);
        }
    };

    const handleUpdateUserRole = async (userId, newRole) => {
        setEditStatus({ type: 'loading', message: '處理中...' });
        try {
            const res = await authFetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            if (data.success) {
                setEditStatus({ type: 'success', message: '權限更新成功' });
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => ({ ...prev, role: newRole }));
                }
            } else {
                setEditStatus({ type: 'error', message: data.error });
            }
        } catch (err) {
            setEditStatus({ type: 'error', message: '網路錯誤' });
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        const newStatus = !currentStatus;
        if (!window.confirm(`確定要${newStatus ? '啟用' : '停用'}此帳號嗎？`)) return;

        setEditStatus({ type: 'loading', message: '處理中...' });
        try {
            const res = await authFetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                setEditStatus({ type: 'success', message: `帳號已${newStatus ? '啟用' : '停用'}` });
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => ({ ...prev, is_active: newStatus }));
                }
            } else {
                setEditStatus({ type: 'error', message: data.error });
            }
        } catch (err) {
            setEditStatus({ type: 'error', message: '網路錯誤' });
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('確定要永久刪除此帳號與其所有資料嗎？此操作無法復原。')) return;
        
        setEditStatus({ type: 'loading', message: '正在刪除帳號...' });
        try {
            const res = await authFetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setEditStatus({ type: 'success', message: '帳號已成功刪除' });
                setUsers(prev => prev.filter(u => u.id !== userId));
                setTimeout(() => {
                    setSelectedUser(null);
                    setEditStatus({ type: '', message: '' });
                }, 1500);
            } else {
                setEditStatus({ type: 'error', message: data.error || '刪除失敗' });
            }
        } catch (err) {
            setEditStatus({ type: 'error', message: '網路錯誤' });
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                <Ban className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-xl font-bold">拒絕存取</h2>
                <p>您沒有權限存取此頁面。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'users' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <Users className="w-4 h-4" /> 使用者清單
                </button>
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${activeTab === 'logs' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    <Activity className="w-4 h-4" /> 操作軌跡紀錄
                </button>
            </div>

            {activeTab === 'users' ? (
                <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <Users className="w-7 h-7 text-brand-primary" /> 使用者管理
                        </h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            管理系統註冊帳號、調整權限與查看用戶持股。總計 {total} 位使用者。
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="搜尋 Email 或暱稱..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-xl text-sm w-full md:w-64 transition-all"
                            />
                        </div>
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 focus:border-brand-primary rounded-xl text-sm transition-all outline-none"
                        >
                            <option value="">所有角色</option>
                            <option value="user">一般用戶</option>
                            <option value="admin">管理員</option>
                            <option value="vip1">VIP 1</option>
                            <option value="vip2">VIP 2</option>
                            <option value="vip3">VIP 3</option>
                            <option value="vip4">VIP 4</option>
                            <option value="vip5">VIP 5</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">使用者</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">角色</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">登入方式</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">註冊日期</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="5" className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div></td>
                                        </tr>
                                    ))
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="w-10 h-10 opacity-20" />
                                                <span>找不到符合條件的使用者</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
                                                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" /> : u.nickname?.[0] || u.email?.[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                        {u.nickname || u.name}
                                                        {u.is_active === false && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-bold tracking-widest uppercase">已停用</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                                                u.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                                                u.role.startsWith('vip') ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-800'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-600 uppercase">{u.provider}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleViewUserDetail(u)}
                                                className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-all"
                                                title="查看詳情與持股"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {total > limit && (
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="text-xs text-slate-500 font-bold">顯示第 {page * limit + 1} 至 {Math.min((page + 1) * limit, total)} 筆，共 {total} 筆</div>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold disabled:opacity-50 hover:border-brand-primary transition-all"
                                >上一頁</button>
                                <button 
                                    disabled={(page + 1) * limit >= total}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold disabled:opacity-50 hover:border-brand-primary transition-all"
                                >下一頁</button>
                            </div>
                        </div>
                    )}
                </div>
                </>
            ) : (
                <AdminAuditLogs />
            )}

            {/* 詳情與持股抽屜面板 (僅在 users 分頁時可能顯示，但放在外層以利動畫) */}
            {selectedUser && createPortal(
                <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                <User className="w-6 h-6 text-brand-primary" /> 使用者詳情
                            </h2>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-3xl text-brand-primary font-black">
                                        {selectedUser.nickname?.[0] || selectedUser.email?.[0]}
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-900 dark:text-slate-50">{selectedUser.nickname || selectedUser.name}</div>
                                        <div className="text-sm text-slate-500 font-mono">{selectedUser.email}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">角色權限</div>
                                        <div className="mt-1">
                                            <select 
                                                value={selectedUser.role}
                                                onChange={(e) => handleUpdateUserRole(selectedUser.id, e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-brand-primary"
                                            >
                                                <option value="user">一般用戶 (User)</option>
                                                <option value="admin">系統管理員 (Admin)</option>
                                                <option value="vip1">VIP 1</option>
                                                <option value="vip2">VIP 2</option>
                                                <option value="vip3">VIP 3</option>
                                                <option value="vip4">VIP 4</option>
                                                <option value="vip5">VIP 5</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">註冊時間</div>
                                        <div className="mt-1 text-sm font-bold text-slate-700">{new Date(selectedUser.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                {editStatus.message && (
                                    <div className={`text-xs font-bold p-2 rounded flex items-center gap-1 ${editStatus.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {editStatus.type === 'error' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {editStatus.message}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-md font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <Shield className="w-5 h-5 text-brand-primary" /> 自選股與清單
                                </h3>
                                
                                {portfolioLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl"></div>)}
                                    </div>
                                ) : userPortfolio.length === 0 ? (
                                    <div className="py-10 text-center text-slate-400 text-sm italic">
                                        該用戶尚未建立任何自選股清單
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {userPortfolio.map(list => (
                                            <div key={list.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                                    <span className="text-sm font-black text-slate-700">{list.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{list.items.length} 標的</span>
                                                </div>
                                                <div className="p-2 grid grid-cols-2 gap-2">
                                                    {list.items.map(item => (
                                                        <div key={item.stock_symbol} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 hover:bg-brand-primary/5 border border-transparent hover:border-brand-primary/20 transition-all group/item">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{item.stock_symbol}</span>
                                                                <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{item.stock_name}</span>
                                                            </div>
                                                            <ExternalLink className="w-3 h-3 text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                        </div>
                                                    ))}
                                                    {list.items.length === 0 && (
                                                        <div className="col-span-2 text-[10px] text-slate-400 italic p-2">清單目前為空</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex gap-3">
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-300 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 dark:bg-slate-800 transition-colors"
                            >
                                關閉面板
                            </button>
                            <button 
                                className={`flex-1 py-3 border rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                                    selectedUser.is_active !== false 
                                    ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                }`}
                                onClick={() => handleToggleActive(selectedUser.id, selectedUser.is_active !== false)}
                            >
                                < Ban className="w-4 h-4" /> {selectedUser.is_active !== false ? '停用帳號' : '啟用帳號'}
                            </button>
                            <button 
                                className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                onClick={() => handleDeleteUser(selectedUser.id)}
                            >
                                < Trash2 className="w-4 h-4" /> 刪除帳號
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
