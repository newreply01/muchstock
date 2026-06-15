import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, BarChart3, PieChart, ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import ChipAnalysisChart from './ChipAnalysisChart';
import { getBrokerTrading, getMarginTrading, getBrokerTrace } from '../../utils/api';

const getBrokerBadge = (name) => {
    // 隔日沖分點
    const dayTraders = ["美商高盛", "摩根大通", "凱基-台北", "富邦-建國", "美林", "瑞士信貸", "摩根士丹利", "野村", "凱基-復興", "富邦-暖暖", "元大-土城東波"];
    // 八大官股
    const govBanks = ["合庫", "土銀", "臺灣金控", "兆豐", "華南永昌", "第一金", "彰銀", "台企銀", "臺灣金-台北", "第一金-台北", "合庫-台北", "華南永昌-台北", "兆豐-台北"];
    // 波段主力
    const swingWhales = ["元大-大同", "永豐金-南京", "元大-台北", "元富-台北", "國泰-敦南", "群益金鼎-台北"];

    if (dayTraders.some(dt => name.includes(dt))) {
        return (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm animate-pulse whitespace-nowrap">
                [隔日沖]
            </span>
        );
    }
    if (govBanks.some(gb => name.includes(gb))) {
        return (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm whitespace-nowrap">
                [八大官股]
            </span>
        );
    }
    if (swingWhales.some(sw => name.includes(sw))) {
        return (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm whitespace-nowrap">
                [波段大戶]
            </span>
        );
    }
    return null;
};

export default function MainForceView({ symbol, subTab, institutionalData, loadingChips }) {
    const [period, setPeriod] = useState('日K');
    const [brokerData, setBrokerData] = useState({ buyers: [], sellers: [], date: null });
    const [marginData, setMarginData] = useState([]);
    const [traceData, setTraceData] = useState([]);
    const [loadingSub, setLoadingSub] = useState(false);

    useEffect(() => {
        if (!symbol) return;

        async function fetchData() {
            setLoadingSub(true);
            try {
                if (subTab === 'force_detail') {
                    const data = await getBrokerTrading(symbol, period);
                    setBrokerData(data);
                } else if (subTab === 'margin_trade') {
                    const { data } = await getMarginTrading(symbol);
                    setMarginData(data);
                } else if (subTab === 'broker_trace' || subTab === 'broker_track') {
                    const { data } = await getBrokerTrace(symbol, 60, period);
                    setTraceData(data);
                }
            } catch (err) {
                console.error('Failed to fetch subtab data:', err);
            } finally {
                setLoadingSub(false);
            }
        }

        fetchData();
    }, [symbol, subTab, period]);

    if (subTab === 'institutional') {
        const latestInst = institutionalData.length > 0 ? institutionalData[institutionalData.length - 1] : null;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                        <div className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Users className="w-3 h-3" /> 外資買賣
                        </div>
                        <div className={`text-xl font-black ${(latestInst?.foreign_net || 0) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {Math.round(latestInst?.foreign_net || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">張</span>
                        </div>
                    </div>
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm transition-all hover:shadow-md">
                        <div className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> 投信買賣
                        </div>
                        <div className={`text-xl font-black ${(latestInst?.trust_net || 0) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {Math.round(latestInst?.trust_net || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">張</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> 自營商
                        </div>
                        <div className={`text-xl font-black ${(latestInst?.dealer_net || 0) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {Math.round(latestInst?.dealer_net || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">張</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                    <h4 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-brand-primary" /> 三大法人持股比重與買賣趨勢
                    </h4>
                    <div className="h-[350px]">
                        {loadingChips ? (
                            <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">數據載入中...</div>
                        ) : (
                            <ChipAnalysisChart data={institutionalData} />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (subTab === 'force_detail') {
        const totalNetBuyer = brokerData.buyers.reduce((sum, b) => sum + b.net_vol, 0);
        const totalNetSeller = Math.abs(brokerData.sellers.reduce((sum, s) => sum + s.net_vol, 0));
        const controlRatio = totalNetBuyer > 0 ? ((totalNetBuyer / (totalNetBuyer + totalNetSeller)) * 100).toFixed(1) : 0;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tighter">主力分點進出明細</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">數據更新日期: {brokerData.date || '---'}</p>
                        </div>
                    </div>
                    {/* Period Switcher & Control Ratio */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 dark:bg-slate-850 p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
                            {['日K', '週K', '月K'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                        period === p
                                            ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 dark:text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-900/60 px-4 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800 hidden md:block">
                            <span className="text-[9px] font-black text-slate-400 block mb-0.5 leading-none">主力控盤度</span>
                            <span className="text-base font-black text-orange-600 leading-none">{controlRatio}%</span>
                        </div>
                    </div>
                </div>

                {loadingSub ? (
                    <div className="h-[400px] flex items-center justify-center text-slate-400 animate-pulse">分點數據載入中...</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 買超排行 */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="bg-red-50/50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
                                <ArrowUpCircle className="w-4 h-4 text-red-500" />
                                <span className="text-xs font-black text-red-700">買超券商前15名</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {brokerData.buyers.map((broker, idx) => (
                                    <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-300 w-4">{idx + 1}</span>
                                            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                                {broker.name}
                                                {getBrokerBadge(broker.name)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-red-500">+{broker.net_vol.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">買 {broker.buy_vol} / 賣 {broker.sell_vol}</div>
                                        </div>
                                    </div>
                                ))}
                                {brokerData.buyers.length === 0 && (
                                    <div className="p-8 text-center text-slate-300 text-xs font-bold">目前無買超數據</div>
                                )}
                            </div>
                        </div>

                        {/* 賣超排行 */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="bg-green-50/50 px-4 py-3 border-b border-green-100 flex items-center gap-2">
                                <ArrowDownCircle className="w-4 h-4 text-green-500" />
                                <span className="text-xs font-black text-green-700">賣超券商前15名</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {brokerData.sellers.map((broker, idx) => (
                                    <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-300 w-4">{idx + 1}</span>
                                            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                                {broker.name}
                                                {getBrokerBadge(broker.name)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-green-600">{broker.net_vol.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">買 {broker.buy_vol} / 賣 {broker.sell_vol}</div>
                                        </div>
                                    </div>
                                ))}
                                {brokerData.sellers.length === 0 && (
                                    <div className="p-8 text-center text-slate-300 text-xs font-bold">目前無賣超數據</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (subTab === 'margin_trade') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[450px]">
                    <h4 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-primary" /> 融資融券餘額趨勢 (近60日)
                    </h4>
                    <div className="h-[350px]">
                        {loadingSub ? (
                            <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">融資數據載入中...</div>
                        ) : marginData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={marginData}>
                                    <defs>
                                        <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorShort" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        fontSize={10}
                                        tick={{ fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                    />
                                    <YAxis
                                        fontSize={10}
                                        tick={{ fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => (val / 1000).toLocaleString() + 'K'}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                    <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                    <Area name="融資餘額" type="monotone" dataKey="margin_balance" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMargin)" strokeWidth={2} />
                                    <Area name="融券餘額" type="monotone" dataKey="short_balance" stroke="#ef4444" fillOpacity={1} fill="url(#colorShort)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold">無歷史融資數據</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (subTab === 'broker_trace' || subTab === 'broker_track') {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[450px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand-primary" /> 主力買賣超趨勢 (近60日)
                        </h4>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 dark:bg-slate-855 p-1 rounded-lg border border-slate-200 dark:border-slate-800 dark:border-slate-700 w-fit">
                            {['日K', '週K', '月K'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                        period === p
                                            ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 dark:text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[350px]">
                        {loadingSub ? (
                            <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">主力趨勢載入中...</div>
                        ) : traceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={traceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        fontSize={10}
                                        tick={{ fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                    />
                                    <YAxis
                                        fontSize={10}
                                        tick={{ fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => (val / 1000).toLocaleString() + 'K'}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    />
                                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                                    <Bar name="主力研判買賣超" dataKey="main_net_vol">
                                        {traceData.map((entry, index) => (
                                            <Cell key={`cell - ${index} `} fill={entry.main_net_vol >= 0 ? '#ef4444' : '#22c55e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold">無歷史主力數據</div>
                        )}
                    </div>
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                            💡 主力買賣超：彙總每日成交量前 15 名券商之淨買賣超張數。連續買超通常代表大戶正在佈局。
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Default placeholder for other subtabs
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px] animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800 shadow-inner">
                <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-600 mb-2 tracking-tighter">功能模組開發中</h3>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {subTab === 'broker_track' ? '分點進跡查詢' : '開發中...'}
            </p>
        </div>
    );
}
