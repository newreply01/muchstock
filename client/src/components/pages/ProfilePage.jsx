import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Key, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authFetch } from '../../utils/auth';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [nickname, setNickname] = useState(user?.nickname || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [emailPassword, setEmailPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [nameStatus, setNameStatus] = useState({ type: '', message: '' });
    const [emailStatus, setEmailStatus] = useState({ type: '', message: '' });
    const [pwdStatus, setPwdStatus] = useState({ type: '', message: '' });

    if (!user) return null;

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setNameStatus({ type: 'loading', message: '更新中...' });
        try {
            const res = await authFetch(`${API_BASE}/auth/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, nickname })
            });
            const data = await res.json();
            if (data.success) {
                setNameStatus({ type: 'success', message: '資料更新成功！' });
                updateUser(data.user);
            } else {
                setNameStatus({ type: 'error', message: data.error || '更新失敗' });
            }
        } catch (err) {
            setNameStatus({ type: 'error', message: '網路連線錯誤' });
        }
    };

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        if (newEmail === user.email) return;
        
        setEmailStatus({ type: 'loading', message: '更新中...' });
        try {
            const res = await authFetch(`${API_BASE}/auth/me/email`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newEmail, password: emailPassword })
            });
            const data = await res.json();
            if (data.success) {
                setEmailStatus({ type: 'success', message: '信箱更新成功！' });
                updateUser(data.user);
                setEmailPassword('');
            } else {
                setEmailStatus({ type: 'error', message: data.error || '更新失敗' });
            }
        } catch (err) {
            setEmailStatus({ type: 'error', message: '網路連線錯誤' });
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPwdStatus({ type: 'error', message: '兩次密碼輸入不一致' });
            return;
        }
        if (newPassword.length < 6) {
            setPwdStatus({ type: 'error', message: '新密碼長度至少需 6 字元' });
            return;
        }

        setPwdStatus({ type: 'loading', message: '更新中...' });
        try {
            const res = await authFetch(`${API_BASE}/auth/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (data.success) {
                setPwdStatus({ type: 'success', message: '密碼更新成功！' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setPwdStatus({ type: 'error', message: data.error || '密碼更新失敗' });
            }
        } catch (err) {
            setPwdStatus({ type: 'error', message: '網路連線錯誤' });
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-3xl font-black text-brand-primary overflow-hidden">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            user.nickname?.[0] || user.name?.[0] || user.email?.[0]
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">{user.nickname || user.name || 'User'}</h1>
                        <p className="text-sm font-medium text-slate-500">{user.email}</p>
                        <div className="mt-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                            登入方式: {user.provider} | 角色: <span className={user.role.startsWith('vip') ? 'text-amber-600' : ''}>{user.role}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <User className="w-5 h-5 text-brand-primary" /> 基本設定
                        </h2>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">真實姓名</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">暱稱</label>
                                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-100" />
                            </div>
                            {nameStatus.message && (
                                <div className={`text-xs font-bold p-2 rounded flex items-center gap-1 ${nameStatus.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {nameStatus.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {nameStatus.message}
                                </div>
                            )}
                            <button type="submit" disabled={nameStatus.type === 'loading' || (name === user.name && nickname === user.nickname)} className="flex items-center justify-center gap-2 w-full bg-brand-primary text-white rounded-lg px-4 py-2 font-bold text-sm tracking-wide disabled:opacity-50 hover:bg-brand-primary/90 transition-colors">
                                <Save className="w-4 h-4" /> 儲存個人資料
                            </button>
                        </form>
                    </div>

                    {/* Security & Email */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <Key className="w-5 h-5 text-brand-primary" /> 帳號安全
                        </h2>
                        
                        {/* Email Update */}
                        <form onSubmit={handleUpdateEmail} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">修改登入信箱</label>
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-100" />
                            </div>
                            {newEmail !== user.email && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">請輸入密碼以確認變更</label>
                                    <input type="password" required value={emailPassword} onChange={e => setEmailPassword(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-100" placeholder="驗證目前密碼" />
                                    <button type="submit" disabled={emailStatus.type === 'loading'} className="flex items-center justify-center gap-2 w-full bg-slate-800 text-white rounded-lg px-4 py-2 font-bold text-sm tracking-wide disabled:opacity-50 hover:bg-slate-900 transition-colors">
                                        更新信箱
                                    </button>
                                </div>
                            )}
                            {emailStatus.message && (
                                <div className={`text-xs font-bold p-2 rounded flex items-center gap-1 ${emailStatus.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {emailStatus.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {emailStatus.message}
                                </div>
                            )}
                        </form>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">目前密碼</label>
                                <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">新密碼</label>
                                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">確認新密碼</label>
                                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary rounded-lg px-4 py-2 text-sm text-slate-800 dark:text-slate-100" />
                            </div>
                            {pwdStatus.message && (
                                <div className={`text-xs font-bold p-2 rounded flex items-center gap-1 ${pwdStatus.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {pwdStatus.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {pwdStatus.message}
                                </div>
                            )}
                            <button type="submit" disabled={pwdStatus.type === 'loading' || !currentPassword || !newPassword || !confirmPassword} className="flex items-center justify-center gap-2 w-full border-2 border-slate-200 dark:border-slate-800 text-slate-600 hover:text-brand-primary hover:border-brand-primary rounded-lg px-4 py-2 font-bold text-sm tracking-wide disabled:opacity-50 transition-colors">
                                更新密碼
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
