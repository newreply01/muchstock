import { useState, useEffect } from 'react';
import { User, Menu, Bell, Globe, LogOut, Settings, Sparkles, Sun, Moon, Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ currentView = 'dashboard' }) {
    const navigate = useNavigate();
    const { user, logout, showLoginModal, setShowLoginModal } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [marketStatus, setMarketStatus] = useState({ text: '讀取中...', color: 'text-gray-400' });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/monitor/status');
                const data = await response.json();
                if (data.success) {
                    const crawler = data.script_status.find(s => s.script === 'realtime_crawler.js');
                    if (crawler) {
                        if (crawler.db_last_status === 'RUNNING') {
                            setMarketStatus({ text: '交易中', color: 'text-brand-success' });
                        } else if (crawler.message.includes('休市')) {
                            setMarketStatus({ text: '休市中', color: 'text-gray-400' });
                        } else {
                            setMarketStatus({ text: crawler.db_last_status, color: 'text-yellow-400' });
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch market status:', error);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 60000); // 每一分鐘更新一次
        return () => clearInterval(interval);
    }, []);
    const dispatchView = (view) => {
        const routesMap = {
            'market': '/',
            'screener': '/screener',
            'trading': '/trading',
            'admin': '/admin',
            'stock-detail': `/stock/2330`, // 預設導向台積電，或可從 Zustand 取得 mainStock
            'news': '/news',
            'profile': '/profile',
            'monitor': '/monitor',
            'market-overview': '/'
        };
        navigate(routesMap[view] || '/');
        window.scrollTo(0, 0);
    };

    const isCloudDeployment = 
        window.location.hostname.includes('zeabur.app') || 
        window.location.hostname.includes('zeabur.com') ||
        window.location.hostname.includes('vercel.app');

    const showMonitor = !isCloudDeployment && (user?.role === 'admin' || !user);

    return (
        <header className="bg-white dark:bg-brand-dark text-slate-800 dark:text-white sticky top-0 z-50 border-b border-slate-200 dark:border-transparent transition-colors duration-300">
            {/* Top Bar for Global Info */}
            <div className="bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/5 py-1 hidden sm:block transition-colors duration-300">
                <div className="container mx-auto px-4 flex justify-between items-center text-[11px] font-medium tracking-wide uppercase text-slate-500 dark:text-gray-400">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> 繁體中文</span>
                        <span>市場狀態: <span className={marketStatus.color}>{marketStatus.text}</span></span>
                    </div>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-brand-primary dark:hover:text-white transition-colors">個人化設定</a>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => dispatchView('market-overview')}
                        className="flex items-center gap-1.5 group"
                    >
                        <div className="bg-brand-primary p-1.5 rounded-sm group-hover:bg-red-500 transition-colors">
                            <div className="text-white font-black text-xl leading-none tracking-tighter">MUCH</div>
                        </div>
                        <div className="text-slate-800 dark:text-white font-bold text-xl tracking-tight ml-1 group-hover:text-brand-primary dark:group-hover:text-brand-primary transition-colors">Stock</div>
                    </button>

                    <nav className="hidden lg:flex items-center gap-8 text-[14px] font-semibold">
                        <button
                            onClick={() => dispatchView('trading')}
                            className={`h-16 flex items-center transition-colors px-1 border-b-2 ${currentView === 'trading' ? 'text-brand-primary font-bold border-brand-primary hover:text-red-400' : 'text-slate-500 dark:text-gray-300 hover:text-brand-primary dark:hover:text-white border-transparent hover:border-brand-primary/30 dark:hover:border-white/20'}`}
                        >
                            交易中心
                        </button>
                        <button
                            onClick={() => dispatchView('market')}
                            className={`h-16 flex items-center transition-colors px-1 border-b-2 ${currentView === 'market' ? 'text-brand-primary font-bold border-brand-primary hover:text-red-400' : 'text-slate-500 dark:text-gray-300 hover:text-brand-primary dark:hover:text-white border-transparent hover:border-brand-primary/30 dark:hover:border-white/20'}`}
                        >
                            市場總覽
                        </button>
                        <button
                            onClick={() => dispatchView('screener')}
                            className={`h-16 flex items-center transition-colors px-1 border-b-2 ${currentView === 'screener' ? 'text-brand-primary font-bold border-brand-primary hover:text-red-400' : 'text-slate-500 dark:text-gray-300 hover:text-brand-primary dark:hover:text-white border-transparent hover:border-brand-primary/30 dark:hover:border-white/20'}`}
                        >
                            智能選股
                        </button>
                        <button
                            onClick={() => dispatchView('stock-detail')}
                            className={`h-16 flex items-center transition-colors px-1 border-b-2 ${currentView === 'stock-detail' ? 'text-brand-primary font-bold border-brand-primary hover:text-red-400' : 'text-slate-500 dark:text-gray-300 hover:text-brand-primary dark:hover:text-white border-transparent hover:border-brand-primary/30 dark:hover:border-white/20'}`}
                        >
                            個股分析
                        </button>
                        <button
                            onClick={() => dispatchView('news')}
                            className={`h-16 flex items-center transition-colors px-1 border-b-2 ${currentView === 'news' ? 'text-brand-primary font-bold border-brand-primary hover:text-red-400' : 'text-slate-500 dark:text-gray-300 hover:text-brand-primary dark:hover:text-white border-transparent hover:border-brand-primary/30 dark:hover:border-white/20'}`}
                        >
                            新聞資訊
                        </button>
                        {showMonitor && (
                            <button
                                onClick={() => dispatchView('monitor')}
                                className={`h-16 flex items-center transition-colors px-1 border-b-2 ${currentView === 'monitor' ? 'text-brand-primary font-bold border-brand-primary hover:text-red-400' : 'text-slate-500 dark:text-gray-300 hover:text-brand-primary dark:hover:text-white border-transparent hover:border-brand-primary/30 dark:hover:border-white/20'}`}
                            >
                                系統監控
                            </button>
                        )}
                    </nav>
                </div>

                <div className="flex items-center gap-5">

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 text-slate-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-white transition-colors"
                            title={theme === 'dark' ? '切換至亮色模式' : '切換至暗色模式'}
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-400" />}
                        </button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                        <button className="p-2 text-slate-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-white transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                        {user ? (
                            <div className="flex items-center gap-3 relative group/menu">
                                <button className="flex items-center gap-2 pl-2">
                                    <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center overflow-hidden">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-brand-primary">{user.name?.[0] || user.email?.[0]}</span>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium hidden sm:block text-slate-600 dark:text-gray-300 group-hover/menu:text-brand-primary dark:group-hover/menu:text-white transition-colors">{user.name || user.email.split('@')[0]}</span>
                                </button>

                                {/* Dropdown */}
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all transform origin-top-right translate-y-2 group-hover/menu:translate-y-0 z-50 overflow-hidden">
                                    <div className="p-3 border-b border-slate-50 dark:border-slate-700/50">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.name || 'User'}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                    </div>
                                    <div className="p-1">
                                        <button
                                            onClick={() => dispatchView('profile')}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <User className="w-4 h-4" /> 個人設定
                                        </button>
                                        {user.role === 'admin' && (
                                            <>
                                                <button
                                                    onClick={() => dispatchView('admin')}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                                                >
                                                    <Settings className="w-4 h-4" /> 系統管理員中心
                                                </button>

                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                logout();
                                                dispatchView('dashboard');
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" /> 登出
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 pl-2 group">
                                <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center group-hover:bg-brand-primary/30 transition-colors">
                                    <User className="w-4 h-4 text-brand-primary" />
                                </div>
                                <span className="text-sm font-medium hidden sm:block text-slate-600 dark:text-gray-300 group-hover:text-brand-primary dark:group-hover:text-white transition-colors">會員登入</span>
                            </button>
                        )}
                    </div>

                    <button
                        className="lg:hidden p-2 text-slate-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden bg-white dark:bg-brand-dark border-t border-slate-200 dark:border-white/5 py-4 px-4 space-y-3 animate-in fade-in slide-in-from-top duration-200">

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { dispatchView('trading'); setIsMenuOpen(false); }} className={`text-center py-2.5 px-3 rounded-xl font-bold text-xs ${currentView === 'trading' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>交易中心</button>
                        <button onClick={() => { dispatchView('market'); setIsMenuOpen(false); }} className={`text-center py-2.5 px-3 rounded-xl font-bold text-xs ${currentView === 'market' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>市場總覽</button>
                        <button onClick={() => { dispatchView('screener'); setIsMenuOpen(false); }} className={`text-center py-2.5 px-3 rounded-xl font-bold text-xs ${currentView === 'screener' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>智能選股</button>
                        <button onClick={() => { dispatchView('stock-detail'); setIsMenuOpen(false); }} className={`text-center py-2.5 px-3 rounded-xl font-bold text-xs ${currentView === 'stock-detail' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>個股分析</button>
                        <button onClick={() => { dispatchView('news'); setIsMenuOpen(false); }} className={`text-center py-2.5 px-3 rounded-xl font-bold text-xs ${showMonitor ? '' : 'col-span-2'} ${currentView === 'news' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>新聞資訊</button>
                        {showMonitor && (
                            <button onClick={() => { dispatchView('monitor'); setIsMenuOpen(false); }} className={`text-center py-2.5 px-3 rounded-xl font-bold text-xs ${currentView === 'monitor' ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>系統監控</button>
                        )}
                    </div>
                </div>
            )}


        </header>
    );
}
