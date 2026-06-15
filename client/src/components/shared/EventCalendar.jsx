import React, { useState, useEffect } from 'react';
import { Calendar, Bell, ChevronRight, Clock, Info } from 'lucide-react';
import { API_BASE } from '../../utils/api';

export default function EventCalendar({ symbol }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        fetch(`${API_BASE}/stock/${symbol}/events`)
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setEvents(res.data || []);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch events:', err);
                setLoading(false);
            });
    }, [symbol]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 border border-dashed border-slate-300 text-center">
                <div className="bg-white dark:bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Calendar className="w-6 h-6 text-slate-300" />
                </div>
                <h3 className="text-slate-900 dark:text-slate-50 font-bold mb-1">近期無重大事件</h3>
                <p className="text-slate-500 text-xs">該檔股票在未來一段時間內尚無已公佈的法說或配息計畫。</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="bg-amber-100 p-2 rounded-xl">
                        <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tighter">近期大事記</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Events Timeline</p>
                    </div>
                </div>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {events.map((event, idx) => {
                    const isDividend = event.type === '除息日';
                    const isUpcoming = new Date(event.date) >= new Date();
                    
                    return (
                        <div key={idx} className="relative group">
                            {/* Dot */}
                            <div className={`absolute -left-[22px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-1 ${isUpcoming ? 'ring-amber-400 bg-amber-500' : 'ring-slate-300 bg-slate-400'}`}></div>
                            
                            <div className={`p-4 rounded-2xl border transition-all duration-300 ${isUpcoming ? 'bg-white dark:bg-slate-900 border-amber-100 shadow-md shadow-amber-500/5 hover:-translate-y-1' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 opacity-80'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isDividend ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {event.type}
                                            </span>
                                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {event.date}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-50 mb-1">{event.description}</h4>
                                    </div>
                                    <div className={`p-2 rounded-xl ${isUpcoming ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 text-blue-700/70">
                <Info className="w-4 h-4 shrink-0" />
                <p className="text-[11px] font-bold leading-relaxed">
                    提醒：法說會與重要日程可能隨時變動，請以公開資訊觀測站最新公告為準。
                </p>
            </div>
        </div>
    );
}
