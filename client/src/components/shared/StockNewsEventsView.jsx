import React, { useState, useEffect } from 'react';
import { Newspaper, Clock, MessageSquare } from 'lucide-react';
import { getStockNews } from '../../utils/api';
import EventCalendar from './EventCalendar';

export default function StockNewsEventsView({ stock }) {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStockNews = async () => {
            if (!stock?.symbol) return;
            setLoading(true);
            try {
                const data = await getStockNews(stock.symbol);
                setNewsList(data || []);
            } catch (err) {
                console.error('Failed to fetch stock-specific news:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStockNews();
    }, [stock]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column: Stock News & Announcements (60%) */}
            <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-primary/10 p-2 rounded-xl border border-brand-primary/20">
                            <Newspaper className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 dark:text-white tracking-tighter">
                                {stock?.name} 個股新聞重訊
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Stock Announcements & News
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-semibold">讀取個股重訊中...</span>
                    </div>
                ) : newsList.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-8 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <MessageSquare className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                        </div>
                        <h3 className="text-slate-900 dark:text-slate-50 dark:text-slate-200 font-bold mb-1">暫無專屬新聞重訊</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">目前資料庫中尚無此個股的專屬重大重訊，您可至全域新聞資訊查看大盤新聞。</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {newsList.map((item) => (
                            <div 
                                key={item.news_id}
                                className="bg-white dark:bg-slate-900 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg dark:hover:shadow-black/20 hover:border-brand-primary/30 transition-all duration-300 group"
                            >
                                <div className="flex gap-4">
                                    <div className="flex-grow space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                                {item.source || '新聞'}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.publish_at || item.date}
                                            </span>
                                        </div>
                                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100 dark:text-white leading-snug group-hover:text-brand-primary transition-colors">
                                            {item.title}
                                        </h4>
                                        {item.summary && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                                                {item.summary}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Column: Company Events Calendar (40%) */}
            <div className="lg:col-span-2 space-y-6 lg:border-l lg:border-slate-100 dark:border-slate-800 lg:dark:border-slate-800 lg:pl-8">
                <EventCalendar symbol={stock?.symbol} />
            </div>
        </div>
    );
}
