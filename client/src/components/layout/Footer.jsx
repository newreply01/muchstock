import { Globe, Shield, HelpCircle, Mail, Facebook, Github } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-white dark:bg-slate-900 dark:bg-brand-dark text-slate-600 dark:text-gray-400 py-12 text-sm mt-auto border-t border-slate-200 dark:border-slate-800 dark:border-white/5 transition-colors duration-300">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-10">
                    <div className="lg:col-span-2">
                        <a href="/" className="flex items-center gap-1.5 mb-6 group">
                            <div className="bg-brand-primary p-1 rounded-sm">
                                <div className="text-white font-black text-lg leading-none tracking-tighter">MUCH</div>
                            </div>
                            <div className="text-slate-900 dark:text-slate-50 dark:text-white font-bold text-lg tracking-tight ml-1">Stock</div>
                        </a>
                        <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-gray-500 mb-6 font-medium">
                            MuchStock提供全球財經專業消息與最即時的台股、美股資訊。致力於串連最有價值的科技社群觀點，並找出台灣在國際趨勢中的定位。
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-white/5 flex items-center justify-center hover:bg-brand-primary/20 hover:text-brand-primary transition-all"><Facebook className="w-4 h-4" /></a>
                            <a href="#" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 hover:text-brand-primary dark:hover:text-white transition-all"><Github className="w-4 h-4" /></a>
                            <a href="#" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 hover:text-brand-primary dark:hover:text-white transition-all"><Mail className="w-4 h-4" /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-slate-900 dark:text-slate-50 dark:text-white font-bold mb-6 text-xs uppercase tracking-widest flex items-center gap-2">
                            <Globe className="w-3 h-3 text-brand-primary" /> 產品服務
                        </h4>
                        <ul className="space-y-4 font-medium text-xs">
                            <li><a href="https://www.twse.com.tw" target="_blank" className="hover:text-brand-primary dark:hover:text-white transition-colors">台灣證券交易所</a></li>
                            <li><a href="https://www.tpex.org.tw" target="_blank" className="hover:text-brand-primary dark:hover:text-white transition-colors">證券櫃檯買賣中心</a></li>
                            <li><a href="https://mops.twse.com.tw" target="_blank" className="hover:text-brand-primary dark:hover:text-white transition-colors">公開資訊觀測站</a></li>
                            <li><a href="#" className="hover:text-brand-primary dark:hover:text-white transition-colors">關於 MuchStock</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-slate-900 dark:text-slate-50 dark:text-white font-bold mb-6 text-xs uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-3 h-3 text-brand-primary" /> 法律條款
                        </h4>
                        <ul className="space-y-4 font-medium text-xs">
                            <li><a href="#" className="hover:text-brand-primary dark:hover:text-white transition-colors">服務條款</a></li>
                            <li><a href="#" className="hover:text-brand-primary dark:hover:text-white transition-colors">隱私權保護</a></li>
                            <li><a href="#" className="hover:text-brand-primary dark:hover:text-white transition-colors">免責聲明</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-slate-900 dark:text-slate-50 dark:text-white font-bold mb-6 text-xs uppercase tracking-widest flex items-center gap-2">
                            <HelpCircle className="w-3 h-3 text-brand-primary" /> 客戶支援
                        </h4>
                        <ul className="space-y-4 font-medium text-xs">
                            <li><a href="#" className="hover:text-brand-primary dark:hover:text-white transition-colors">常見問題 FAQ</a></li>
                            <li><a href="mailto:support@muchstock.com" className="hover:text-brand-primary dark:hover:text-white transition-colors">聯絡我們</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 dark:border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-bold text-slate-400 dark:text-gray-600 uppercase tracking-widest">
                    <p>&copy; 2026 ANUE STOCK SCREENER. MADE WITH CORE EXCELLENCE.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-slate-600 dark:hover:text-gray-400">登入系統</a>
                        <a href="#" className="hover:text-slate-600 dark:hover:text-gray-400">API 文件</a>
                        <a href="#" className="hover:text-slate-600 dark:hover:text-gray-400">系統狀態</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
