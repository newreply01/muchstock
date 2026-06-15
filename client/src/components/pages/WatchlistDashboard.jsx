import { useState, useEffect } from 'react';
import { Layers, Search, Trash2, FolderSync } from 'lucide-react';
import ResultTable from '../forms/ResultTable';
import { getWatchlists, removeStockFromWatchlist } from '../../utils/api';

export default function WatchlistDashboard({ onStockClick, watchedSymbols, onToggleWatchlist }) {
    const [watchlists, setWatchlists] = useState([]);
    const [activeListId, setActiveListId] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchLists = async () => {
        setLoading(true);
        try {
            const res = await getWatchlists();
            if (res.success) {
                setWatchlists(res.data);
                if (res.data.length > 0 && !activeListId) {
                    setActiveListId(res.data[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch watchlists', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLists();
    }, []);

    const handleRemove = async (symbol) => {
        if (!activeListId) return;
        try {
            await removeStockFromWatchlist(activeListId, symbol);
            fetchLists();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('移除失敗');
        }
    };

    const activeList = watchlists.find(w => w.id === activeListId);

    // Transform watchlist items to look like screener results
    const resultsData = activeList?.items || [];
    const results = {
        data: resultsData,
        total: resultsData.length,
        page: 1,
        totalPages: 1,
        latestDate: null // Optional
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                        <FolderSync className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-brand-dark tabular-nums tracking-tighter">我的自選股</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">自訂您的追蹤標的</p>
                    </div>
                </div>

                {/* Tabs for multiple watchlists if needed */}
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                    {watchlists.map(wl => (
                        <button
                            key={wl.id}
                            onClick={() => setActiveListId(wl.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold min-w-max transition-colors
                                ${activeListId === wl.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800'}
                            `}
                        >
                            {wl.name} <span className="text-xs opacity-70 ml-1">({wl.items?.length || 0})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 p-6">
                {loading ? (
                    <div className="py-20 flex justify-center text-slate-400 font-bold">加載中...</div>
                ) : resultsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                        <Layers className="w-24 h-24 stroke-[1px] opacity-20 mb-6" />
                        <div className="text-xl font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest italic">清單內尚無標的</div>
                        <p className="text-xs font-bold uppercase tracking-tighter mt-3 text-slate-400">請前往台股篩選頁面加入自選股</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Search className="w-4 h-4 text-purple-600" />
                                {activeList?.name} 清單列表
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">點擊列查看詳情，點擊右側圖示移除不感興趣的標的</span>
                        </div>
                        {/* We reuse ResultTable but inject a custom action column or wrapper for removing stocks. */}
                        {/* For simplicity we'll render a simplified table or use ResultTable with modifications. Let's use ResultTable. */}
                        <div className="relative">
                            <ResultTable
                                results={results}
                                loading={false}
                                sortBy=""
                                sortDir=""
                                onSort={() => { }}
                                page={1}
                                onPageChange={() => { }}
                                onStockClick={onStockClick}
                                watchedSymbols={watchedSymbols}
                                onToggleWatchlist={onToggleWatchlist}
                            />
                            {/* We will add removal button in ResultTable itself if watchlists active, or just keep it simple. */}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

