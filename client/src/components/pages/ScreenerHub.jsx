import { useState } from 'react';
import { Filter, Activity, ActivitySquare } from 'lucide-react';
import ScreenerConfigPage from './ScreenerConfigPage';
import PatternAnalysisDashboard from './PatternAnalysisDashboard';
import HealthCheckRanking from './HealthCheckRanking';
import ResultTable from '../forms/ResultTable';

export default function ScreenerHub({
    // Screener Props
    onFilter, onClear, filters, results, loading, sortBy, sortDir, onSort, page, onPageChange, onStockClick, watchedSymbols, onToggleWatchlist,
    // Pattern Props
    mainStock, activePatterns, setActivePatterns, onCompare,
    activeCompareSymbols
}) {
    const [activeTab, setActiveTab] = useState('screener'); // 'screener' | 'pattern' | 'health'

    const tabs = [
        { id: 'screener', label: '條件選股', icon: Filter },
        { id: 'pattern', label: '型態選股', icon: Activity },
        { id: 'health', label: '健診排行', icon: ActivitySquare },
    ];

    return (
        <div className="space-y-6">
            {/* Screener Hub Navigation */}
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
                {activeTab === 'screener' && (
                    <ScreenerConfigPage
                        onFilter={onFilter}
                        onClear={onClear}
                        filters={filters}
                        onBack={() => setActiveTab('pattern')}
                        results={results}
                        loading={loading}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={onSort}
                        page={page}
                        onPageChange={onPageChange}
                        onStockClick={onStockClick}
                        watchedSymbols={watchedSymbols}
                        onToggleWatchlist={onToggleWatchlist}
                    />
                )}
                
                {activeTab === 'pattern' && (
                    <PatternAnalysisDashboard
                        selectedStock={mainStock}
                        symbol={mainStock?.symbol}
                        activePatterns={activePatterns}
                        onPatternsChange={setActivePatterns}
                        onStockSelect={onStockClick}
                    >
                        <ResultTable
                            results={results}
                            loading={loading}
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={onSort}
                            page={page}
                            onPageChange={onPageChange}
                            onStockClick={onStockClick}
                            watchedSymbols={watchedSymbols}
                            onToggleWatchlist={onToggleWatchlist}
                            onCompare={onCompare}
                        />
                    </PatternAnalysisDashboard>
                )}

                {activeTab === 'health' && (
                    <HealthCheckRanking onSelectStock={onStockClick} />
                )}
            </div>
        </div>
    );
}
