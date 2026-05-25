import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { searchStocks } from '../../utils/api';

export default function StockSearchAutocomplete({ onSelectStock }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchDebounced = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            setLoading(true);
            try {
                const data = await searchStocks(query, 8);
                setResults(data);
                setIsOpen(data.length > 0);
            } catch (err) {
                console.error('Search failed:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms 避震

        return () => clearTimeout(fetchDebounced);
    }, [query]);

    const handleSelect = (stock) => {
        setQuery('');
        setIsOpen(false);
        if (onSelectStock) onSelectStock(stock);
    };

    return (
        <div ref={wrapperRef} className="relative w-full z-10">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-brand-primary animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                    )}
                </div>
                <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/50 transition-all shadow-sm hover:shadow-md"
                    placeholder="搜尋股票代號或名稱..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true) }}
                />
            </div>

            {isOpen && (
                <div className="absolute mt-2 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md bg-white/95 dark:bg-slate-800/95">
                    <ul className="max-h-80 overflow-y-auto overscroll-contain">
                        {results.length > 0 ? (
                            results.map((stock) => (
                                <li
                                    key={stock.symbol}
                                    onClick={() => handleSelect(stock)}
                                    className="px-4 py-3 flex gap-4 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors border-b border-slate-50/50 dark:border-slate-700/50 last:border-0 group"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-primary/5 dark:bg-brand-primary/10 flex items-center justify-center border border-brand-primary/10 dark:border-brand-primary/20 group-hover:bg-brand-primary group-hover:border-brand-primary transition-all">
                                        <TrendingUp className="w-5 h-5 text-brand-primary dark:text-brand-primary/80 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-800 dark:text-slate-200 text-sm truncate">{stock.name}</span>
                                            <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 dark:bg-brand-primary/20 px-1.5 py-0.5 rounded tracking-widest">{stock.symbol}</span>
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            {stock.industry && (
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 rounded-sm">{stock.industry}</span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-6 text-sm font-bold text-slate-400 dark:text-slate-500 text-center flex flex-col items-center gap-2">
                                <Search className="w-6 h-6 text-slate-200 dark:text-slate-600" />
                                沒有找到符合的標的
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
