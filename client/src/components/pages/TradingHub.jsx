import { useState } from 'react';
import { Briefcase, LineChart, PieChart, Star, Clock } from 'lucide-react';
import TradingDashboard from './TradingDashboard';
import PortfolioDashboard from './PortfolioDashboard';
import PositionAnalysis from './PositionAnalysis';
import WatchlistDashboard from './WatchlistDashboard';
import RealtimeExplorer from './RealtimeExplorer';

export default function TradingHub({
    onStockSelect,
    watchedSymbols,
    onToggleWatchlist,
    watchlists,
    onRefreshWatchlists,
    requireLogin
}) {
    const [activeTab, setActiveTab] = useState('trading');

    const tabs = [
        { id: 'trading', label: '即時看盤', icon: LineChart },
        { id: 'realtime', label: '分時交易', icon: Clock },
        { id: 'portfolio', label: '投資組合', icon: Briefcase },
        { id: 'position', label: '持倉分析', icon: PieChart },
        { id: 'watchlist', label: '自選股', icon: Star },
    ];

    return (
        <div className="space-y-6">
            {/* Trading Hub Navigation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex gap-2 overflow-x-auto shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (['portfolio', 'position', 'watchlist'].includes(tab.id) && !requireLogin()) return;
                                setActiveTab(tab.id);
                            }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                                isActive 
                                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'trading' && (
                    <TradingDashboard
                        watchlists={watchlists}
                        watchedSymbols={watchedSymbols}
                        onRefreshWatchlists={onRefreshWatchlists}
                        requireLogin={requireLogin}
                    />
                )}

                {activeTab === 'realtime' && (
                    <RealtimeExplorer onStockSelect={onStockSelect} />
                )}
                
                {activeTab === 'portfolio' && (
                    <PortfolioDashboard
                        onStockClick={onStockSelect}
                    />
                )}

                {activeTab === 'position' && (
                    <PositionAnalysis />
                )}

                {activeTab === 'watchlist' && (
                    <WatchlistDashboard
                        onStockClick={onStockSelect}
                        watchedSymbols={watchedSymbols}
                        onToggleWatchlist={onToggleWatchlist}
                    />
                )}
            </div>
        </div>
    );
}
