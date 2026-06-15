import { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GOOGLE_CLIENT_ID = '529089321006-kcjsbg5va3ql7sadfqq53r3upfvtvlr5.apps.googleusercontent.com';

export default function LoginModal({ isOpen, onClose }) {
    const { login, register, googleLogin } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const googleBtnRef = useRef(null);

    // 初始化 Google Sign-In
    useEffect(() => {
        if (!isOpen) return;

        const initGoogle = () => {
            if (window.google && googleBtnRef.current) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                });
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'continue_with',
                    locale: 'zh-TW',
                });
            }
        };

        // 如果 script 已載入
        if (window.google) {
            initGoogle();
        } else {
            // 動態載入 Google Identity Services
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initGoogle;
            document.head.appendChild(script);
        }
    }, [isOpen, mode]);

    const handleGoogleResponse = async (response) => {
        setError('');
        setLoading(true);
        try {
            await googleLogin(response.credential);
            onClose();
        } catch (err) {
            setError(err.message || 'Google 登入失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                await register(email, password, name, nickname);
            } else {
                await login(email, password);
            }
            onClose();
            setEmail('');
            setPassword('');
            setName('');
            setNickname('');
        } catch (err) {
            setError(err.message || '操作失敗');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-8 text-white text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30 shadow-lg">
                        {mode === 'login' ? (
                            <LogIn className="w-8 h-8 text-white" />
                        ) : (
                            <UserPlus className="w-8 h-8 text-white" />
                        )}
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                        {mode === 'login' ? '歡迎回來' : '建立帳號'}
                    </h2>
                    <p className="text-white/80 text-sm mt-1 font-medium">
                        {mode === 'login' ? '登入以存取您的個人化功能' : '註冊以享受完整的投資工具'}
                    </p>
                </div>

                {/* Body */}
                <div className="p-8">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-600 text-sm font-medium animate-in slide-in-from-top-2 duration-200">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="真實姓名"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium transition-all"
                                />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="暱稱 (顯示於討論區/個人資料)"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium transition-all"
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                placeholder="Email 信箱"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium transition-all"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder={mode === 'register' ? '密碼（至少 6 個字元）' : '密碼'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={mode === 'register' ? 6 : undefined}
                                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">或</span>
                        <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Google Sign-In */}
                    <div className="flex justify-center">
                        <div ref={googleBtnRef} className="w-full"></div>
                    </div>

                    {/* Toggle Mode */}
                    <p className="text-center text-sm text-slate-500 mt-6 font-medium">
                        {mode === 'login' ? '還沒有帳號？' : '已有帳號？'}
                        <button
                            onClick={switchMode}
                            className="text-indigo-600 hover:text-indigo-700 font-bold ml-1 transition-colors"
                        >
                            {mode === 'login' ? '立即註冊' : '立即登入'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
