import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, ChevronRight, Star, Heart, Activity, BarChart2, List } from 'lucide-react';
import { getInstitutionalRank, getInstitutionalTotal, getMarketMargin } from '../../utils/api';
import useGlobalStore from '../../store/useGlobalStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, LineChart, Line, AreaChart, Area } from 'recharts';

const InstitutionalRankView = ({ watchedSymbols, onToggleWatchlist }) => {
  const [viewMode, setViewMode] = useState('rank'); // rank, total, margin
  const [data, setData] = useState([]);
  const [totalData, setTotalData] = useState([]);
  const [marginData, setMarginData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('market_summary'); // market_summary, foreign, investment, dealer
  const [activeAction, setActiveAction] = useState('buy'); // buy, sell
  const [timeRange, setTimeRange] = useState('3d'); // 3d, 5d, 10d
  const { globalMarket, globalStockTypes } = useGlobalStore();
  const marketForApi = globalMarket === 'all' ? undefined : globalMarket;
  const stockTypesForApi = globalStockTypes.join(',');

  // 獨立獲取大盤匯總數據，確保在分頁切換前就有數據
  const fetchMarketSummary = async () => {
    try {
      const res = await getInstitutionalTotal({ days: 30 });
      if (res.success) setTotalData(res.data);
    } catch (e) {
      console.error('Fetch institutional total error:', e);
    }
  };

  useEffect(() => {
    fetchMarketSummary();
  }, []);

  useEffect(() => {
    if (viewMode === 'rank') {
      if (activeType === 'market_summary') {
          setLoading(false);
          return;
      }
      const fetchData = async () => {
        setLoading(true);
        try {
          const res = await getInstitutionalRank({
            type: activeType,
            range: timeRange,
            action: activeAction,
            market: marketForApi,
            stock_types: stockTypesForApi
          });
          if (res.success) setData(res.data);
        } catch (e) {
          console.error('Fetch institutional rank error:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else if (viewMode === 'total') {
      const fetchTotalData = async () => {
        setLoading(true);
        try {
          const res = await getInstitutionalTotal({ days: 30 });
          if (res.success) setTotalData(res.data);
        } catch (e) {
          console.error('Fetch institutional total error:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchTotalData();
    } else if (viewMode === 'margin') {
      const fetchMarginData = async () => {
        setLoading(true);
        try {
          const res = await getMarketMargin();
          if (res.success) setMarginData(res.data);
        } catch (e) {
          console.error('Fetch market margin error:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchMarginData();
    }
  }, [viewMode, activeType, timeRange, activeAction, marketForApi, stockTypesForApi]);

  const tabs = [
    { label: '大盤彙整', id: 'market_summary', icon: <BarChart2 className="w-4 h-4" /> },
    { label: '外資', id: 'foreign', icon: <TrendingUp className="w-4 h-4" /> },
    { label: '投信', id: 'investment', icon: <Users className="w-4 h-4" /> },
    { label: '自營商', id: 'dealer', icon: <Activity className="w-4 h-4" /> },
  ];

  const ranges = [
    { label: '近 3 日', id: '3d' },
    { label: '近 5 日', id: '5d' },
    { label: '近 10 日', id: '10d' },
  ];

  const MarketInstitutionalSummary = () => {
    if (totalData.length === 0) return (
        <div className="py-20 text-center animate-pulse">
            <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">大盤彙整數據加載中...</p>
        </div>
    );

    const latest = totalData[0];
    const items = [
        { label: '外資及陸資', buy: latest.foreign_buy, sell: latest.foreign_sell, net: latest.foreign_net, color: 'blue' },
        { label: '投信', buy: latest.trust_buy, sell: latest.trust_sell, net: latest.trust_net, color: 'orange' },
        { label: '自營商', buy: latest.dealer_buy, sell: latest.dealer_sell, net: latest.dealer_net, color: 'teal' },
        { label: '合計', buy: latest.total_buy, sell: latest.total_sell, net: latest.total_net, color: 'brand' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-brand-primary" />
                    最新大盤法人買賣彙整 ({latest.date})
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                    <div key={item.label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                            <div className={`w-2 h-2 rounded-full bg-${item.color}-500 shadow-[0_0_8px_rgba(var(--color-${item.color}-500),0.5)]`}></div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-400">買進</span>
                                <span className="text-slate-700">{parseFloat(item.buy).toFixed(2)} 億</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-400">賣出</span>
                                <span className="text-slate-700">{parseFloat(item.sell).toFixed(2)} 億</span>
                            </div>
                            <div className="pt-2 border-t border-slate-50 flex justify-between items-end">
                                <span className="text-xs font-black text-slate-500">買賣超</span>
                                <span className={`text-xl font-black tabular-nums ${item.net > 0 ? 'text-red-500' : item.net < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {item.net > 0 ? '+' : ''}{parseFloat(item.net).toFixed(2)} <span className="text-[10px]">億</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white overflow-hidden rounded-3xl border border-slate-100 shadow-sm mt-4">
                <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest">
                    近 5 日市場法人動向 (單位: 億元)
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-slate-50">
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase">日期</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right">外資</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right">投信</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right">自營商</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase text-right">合計</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {totalData.slice(0, 5).map((row) => (
                            <tr key={row.date} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3 text-xs font-bold text-slate-600">{row.date}</td>
                                <td className={`px-6 py-3 text-xs font-black text-right ${row.foreign_net > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {row.foreign_net > 0 ? '+' : ''}{parseFloat(row.foreign_net).toFixed(1)}
                                </td>
                                <td className={`px-6 py-3 text-xs font-black text-right ${row.trust_net > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {row.trust_net > 0 ? '+' : ''}{parseFloat(row.trust_net).toFixed(1)}
                                </td>
                                <td className={`px-6 py-3 text-xs font-black text-right ${row.dealer_net > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {row.dealer_net > 0 ? '+' : ''}{parseFloat(row.dealer_net).toFixed(1)}
                                </td>
                                <td className={`px-6 py-3 text-xs font-black text-right ${row.total_net > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {row.total_net > 0 ? '+' : ''}{parseFloat(row.total_net).toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const MarketMarginView = () => {
    const chartData = [...marginData].reverse().map(d => ({
        ...d,
        marginBalance: parseFloat((d.margin_balance / 100000000).toFixed(2)),
        shortBalance: parseFloat((d.short_balance / 1000).toFixed(0)), // 單位: 千張
        indexPrice: parseFloat(d.index_price || 0)
    }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-primary" />
                        全市場融資餘額走勢 (單位: 億元)
                    </h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                fontSize={10} 
                                fontWeight="bold"
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(str) => str.split('-').slice(1).join('/')}
                            />
                            <YAxis 
                                yAxisId="left"
                                fontSize={10} 
                                fontWeight="bold" 
                                axisLine={false}
                                tickLine={false}
                                domain={['auto', 'auto']}
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                fontSize={10} 
                                fontWeight="bold" 
                                axisLine={false}
                                tickLine={false}
                                domain={['auto', 'auto']}
                                hide={false}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area yAxisId="left" type="monotone" dataKey="marginBalance" name="融資餘額" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorMargin)" />
                            <Line yAxisId="right" type="monotone" dataKey="indexPrice" name="加權指數" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">日期</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">融資餘額 (億)</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">加權指數</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">融券餘額 (千張)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {marginData.map((row) => (
                            <tr key={`${row.date}-${row.name}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-slate-600 tabular-nums">{row.date}</td>
                                <td className="px-6 py-4 text-sm font-black text-right tabular-nums text-red-500">
                                    {parseFloat(row.margin_balance / 100000000).toFixed(1)}
                                </td>
                                <td className="px-6 py-4 text-sm font-black text-right tabular-nums text-blue-600">
                                    {row.index_price ? parseFloat(row.index_price).toLocaleString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm font-black text-right tabular-nums text-slate-800">
                                    {parseFloat(row.short_balance / 1000).toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const MarketTotalView = () => {
    const chartData = [...totalData].reverse().map(d => ({
        ...d,
        foreign: parseFloat(parseFloat(d.foreign_net).toFixed(2)),
        investment: parseFloat(parseFloat(d.trust_net).toFixed(2)),
        dealer: parseFloat(parseFloat(d.dealer_net).toFixed(2)),
        total: parseFloat(parseFloat(d.total_net).toFixed(2)),
    }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 圖表區塊 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-brand-primary" />
                        法人大盤買賣趨勢 (單位: 億元)
                    </h3>
                    <div className="flex gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div>外資</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-orange-500"></div>投信</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-teal-500"></div>自營商</div>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                fontSize={10} 
                                fontWeight="bold"
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(str) => str.split('-').slice(1).join('/')}
                                dy={10}
                            />
                            <YAxis 
                                fontSize={10} 
                                fontWeight="bold" 
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <ReferenceLine y={0} stroke="#94a3b8" />
                            <Bar dataKey="foreign" name="外資" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="investment" name="投信" fill="#f97316" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="dealer" name="自營商" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 表格區塊 */}
            <div className="bg-white overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">日期</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">外資 (億)</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">投信 (億)</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">自營商 (億)</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">合計 (億)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {totalData.map((row, idx) => (
                            <tr key={row.date} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-slate-600 tabular-nums">{row.date}</td>
                                <td className={`px-6 py-4 text-sm font-black text-right tabular-nums ${row.foreign_net > 0 ? 'text-red-500' : row.foreign_net < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {row.foreign_net > 0 ? '+' : ''}{parseFloat(row.foreign_net).toFixed(1)}
                                </td>
                                <td className={`px-6 py-4 text-sm font-black text-right tabular-nums ${row.trust_net > 0 ? 'text-red-500' : row.trust_net < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {row.trust_net > 0 ? '+' : ''}{parseFloat(row.trust_net).toFixed(1)}
                                </td>
                                <td className={`px-6 py-4 text-sm font-black text-right tabular-nums ${row.dealer_net > 0 ? 'text-red-500' : row.dealer_net < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {row.dealer_net > 0 ? '+' : ''}{parseFloat(row.dealer_net).toFixed(1)}
                                </td>
                                <td className={`px-6 py-4 text-sm font-black text-right tabular-nums ${row.total_net > 0 ? 'text-red-500' : row.total_net < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {row.total_net > 0 ? '+' : ''}{parseFloat(row.total_net).toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 頂部導航與標題 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-primary/10 rounded-2xl">
              <Users className="text-brand-primary w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">市場資金與信用籌碼</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium">追蹤法人與融資動態，掌握市場短中長期變化的關鍵指標</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
           <button 
             onClick={() => setViewMode('rank')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${viewMode === 'rank' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             <List className="w-4 h-4" />
             個股排名
           </button>
           <button 
             onClick={() => setViewMode('total')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${viewMode === 'total' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             <BarChart2 className="w-4 h-4" />
             法人統計
           </button>
           <button 
             onClick={() => setViewMode('margin')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${viewMode === 'margin' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
           >
             <Activity className="w-4 h-4" />
             融資融券
           </button>
        </div>
      </div>

      {viewMode === 'rank' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
            {activeType !== 'market_summary' && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {[
                        { label: '買超排行', id: 'buy' },
                        { label: '賣超排行', id: 'sell' },
                        ].map(a => (
                        <button
                            key={a.id}
                            onClick={() => setActiveAction(a.id)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeAction === a.id
                            ? (activeAction === 'buy' ? 'bg-red-500 text-white shadow-sm' : 'bg-green-600 text-white shadow-sm')
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            }`}
                        >
                            {a.label}
                        </button>
                        ))}
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {ranges.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setTimeRange(r.id)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === r.id
                            ? 'bg-brand-primary text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            }`}
                        >
                            {r.label}
                        </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveType(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all whitespace-nowrap font-bold ${activeType === tab.id
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
                ))}
            </div>

            {activeType === 'market_summary' ? (
                <MarketInstitutionalSummary />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse h-40 shadow-sm"></div>
                ))
                ) : data.length > 0 ? (
                data.map((stock, idx) => (
                    <div
                    key={stock.symbol}
                    className="group bg-white border border-slate-100 hover:border-brand-primary/30 rounded-2xl p-5 transition-all hover:shadow-lg hover:-translate-y-1 relative overflow-hidden"
                    >
                    <div className={`absolute -top-1 -right-1 w-12 h-12 flex items-center justify-center rounded-bl-3xl ${idx < 3 ? 'bg-brand-primary/10' : 'bg-slate-100'}`}>
                        <span className={`font-black italic text-lg opacity-80 ${idx < 3 ? 'text-brand-primary' : 'text-slate-400'}`}>#{idx + 1}</span>
                    </div>

                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-slate-800 group-hover:text-brand-primary transition-colors">{stock.name}</h3>
                            <div className="text-brand-primary font-bold text-sm bg-brand-primary/10 px-1.5 py-0.5 rounded">{stock.symbol}</div>
                        </div>
                        {stock.industry && (
                            <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm w-fit bg-slate-100 text-slate-500">
                            {stock.industry}
                            </span>
                        )}
                        </div>
                        <button
                        onClick={() => onToggleWatchlist(stock.symbol)}
                        className={`p-2 rounded-xl transition-colors ${watchedSymbols.has(stock.symbol) ? 'bg-yellow-50 text-yellow-500' : 'bg-slate-50 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50'
                            }`}
                        >
                        <Star className={`w-4 h-4 ${watchedSymbols.has(stock.symbol) ? 'fill-current' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                        <div className="space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">法人淨{activeAction === 'buy' ? '買超' : '賣超'}</div>
                        <div className={`text-xl font-black tabular-nums ${activeAction === 'buy' ? 'text-red-500' : 'text-green-600'}`}>
                            {activeAction === 'buy' ? '+' : '-'}{parseFloat(Math.abs(stock.net_buy)).toFixed(1)} <span className="text-[10px] font-bold ml-0.5 text-slate-500">張</span>
                        </div>
                        </div>
                        <div className="text-right space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">今日價位 / 漲跌</div>
                        <div className={`text-sm font-black tabular-nums flex flex-col items-end ${stock.change_percent > 0 ? 'text-red-500' : stock.change_percent < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                            <span className="text-slate-800 text-base">{parseFloat(stock.close_price).toFixed(2)}</span>
                            <span className="text-[11px]">
                                {stock.change_percent > 0 ? '▲' : stock.change_percent < 0 ? '▼' : ''}
                                {Math.abs(stock.change_amount || 0).toFixed(2)} ({Math.abs(stock.change_percent || 0).toFixed(2)}%)
                            </span>
                        </div>
                        </div>
                    </div>
                    </div>
                ))
                ) : (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">查無相關排名數據</p>
                </div>
                )}
            </div>
            )}
        </div>
      ) : viewMode === 'total' ? (
          loading && totalData.length === 0 ? (
              <div className="py-20 text-center animate-pulse">
                  <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">法人大盤數據加載中...</p>
              </div>
          ) : (
              <MarketTotalView />
          )
      ) : (
          loading && marginData.length === 0 ? (
              <div className="py-20 text-center animate-pulse">
                  <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">融資融券數據加載中...</p>
              </div>
          ) : (
              <MarketMarginView />
          )
      )}
    </div>
  );
};

export default InstitutionalRankView;
