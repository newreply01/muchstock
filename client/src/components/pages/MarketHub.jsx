import { useState } from 'react';
import { Activity, Clock, Users, Zap, Globe } from 'lucide-react';
import MarketDashboard from './MarketDashboard';
import InstitutionalRankView from './InstitutionalRankView';
import MarketSentimentView from './MarketSentimentView';
import NewsBoard from './NewsBoard';

export default function MarketHub({ onStockSelect, watchedSymbols, onToggleWatchlist }) {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: '大盤概況', icon: Globe },
        { id: 'institutional', label: '三大法人', icon: Users },
        { id: 'sentiment', label: '市場情緒', icon: Zap },
    ];

    return (
        <div className="space-y-6">
            {/* Market Hub Navigation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex gap-2 overflow-x-auto shadow-sm">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
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
                {activeTab === 'overview' && (
                    <MarketDashboard onStockSelect={onStockSelect} />
                )}
                
                {activeTab === 'institutional' && (
                    <InstitutionalRankView
                        watchedSymbols={watchedSymbols}
                        onToggleWatchlist={onToggleWatchlist}
                    />
                )}

                {activeTab === 'sentiment' && (
                    <MarketSentimentView />
                )}
            </div>
        </div>
    );
}
