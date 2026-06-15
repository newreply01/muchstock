import React, { useState, useEffect, useMemo } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
    AreaChart, Area
} from 'recharts';
import { Shield, TrendingUp, TrendingDown, Heart, Target, Coins, Users, Award, AlertTriangle, Activity, CheckCircle2, Circle, Newspaper } from 'lucide-react';
import { API_BASE, getHealthHistory } from '../../utils/api';

const DIMENSION_ICONS = {
    '獲利能力 (20%)': TrendingUp,
    '成長能力 (15%)': Target,
    '安全性 (7%)': Shield,
    '價值衡量 (15%)': Award,
    '配息能力 (10%)': Coins,
    '籌碼面 (13%)': Users,
    '消息面 (20%)': Newspaper
};

const GRADE_STYLES = {
    green: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', ring: 'ring-emerald-400', glow: 'shadow-emerald-200/50' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', ring: 'ring-blue-400', glow: 'shadow-blue-200/50' },
    yellow: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', ring: 'ring-amber-400', glow: 'shadow-amber-200/50' },
    red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', ring: 'ring-red-400', glow: 'shadow-red-200/50' },
    neutral: { bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-300', text: 'text-slate-700', ring: 'ring-slate-400', glow: 'shadow-slate-200/50' }
};

function getScoreColor(score) {
    if (score >= 75) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 45) return '#f59e0b';
    return '#ef4444';
}

function getScoreLabel(score) {
    if (score >= 75) return '優';
    if (score >= 60) return '良';
    if (score >= 45) return '平';
    return '劣';
}

export default function HealthCheckView({ symbol }) {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        setError(null);

        Promise.all([
            fetch(`${API_BASE}/stock/${symbol}/health-check`).then(r => r.json()),
            getHealthHistory(symbol)
        ])
            .then(([healthData, historyData]) => {
                setData(healthData);
                if (historyData && historyData.success) {
                    setHistory(historyData.data || []);
                }
                setLoading(false);
            })
            .catch(e => {
                console.error('Health check fetch error:', e);
                if (data && data.success) {
                    setLoading(false);
                } else {
                    setError(e.message);
                    setLoading(false);
                }
            });
    }, [symbol]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
                <p className="font-bold tracking-widest text-sm uppercase">讀取健診數據...</p>
            </div>
        );
    }

    if (error || !data?.success) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
                <p className="font-bold text-slate-600">健診資料載入失敗</p>
                <p className="text-sm text-slate-400 mt-1">{error || '暫無資料'}</p>
            </div>
        );
    }

    const { overall, grade, gradeColor, dimensions, metrics } = data;
    const style = GRADE_STYLES[gradeColor] || GRADE_STYLES.neutral;

    // 標註權重
    const radarData = dimensions.map(d => ({
        dimension: d.name.includes('%') ? d.name :
            d.name === '獲利能力' ? '獲利能力 (20%)' :
            d.name === '成長能力' ? '成長能力 (15%)' :
            d.name === '價值衡量' ? '價值衡量 (15%)' :
            d.name === '籌碼面' ? '籌碼面 (13%)' :
            d.name === '安全性' ? '安全性 (7%)' :
            d.name === '配息能力' ? '配息能力 (10%)' :
            d.name === '消息面' ? '消息面 (20%)' : d.name,
        score: d.score,
        fullMark: 100
    }));

    const barData = dimensions.map(d => ({
        name: d.name.includes('%') ? d.name :
            d.name === '獲利能力' ? '獲利能力 (20%)' :
            d.name === '成長能力' ? '成長能力 (15%)' :
            d.name === '價值衡量' ? '價值衡量 (15%)' :
            d.name === '籌碼面' ? '籌碼面 (13%)' :
            d.name === '安全性' ? '安全性 (7%)' :
            d.name === '配息能力' ? '配息能力 (10%)' :
            d.name === '消息面' ? '消息面 (20%)' : d.name,
        score: d.score,
        fill: getScoreColor(d.score)
    }));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 p-8">
            <div className={`${style.bg} ${style.border} border-2 rounded-2xl p-6 shadow-lg ${style.glow} ring-1 ${style.ring}`}>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex items-center gap-6 border-r border-slate-200 dark:border-slate-800 pr-8">
                        <div>
                            <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">綜合健康評分</div>
                            <div className="flex items-baseline gap-3">
                                <span className={`text-6xl font-black tabular-nums ${style.text}`}>{overall}</span>
                                <span className="text-lg font-bold text-slate-400">/ 100</span>
                            </div>
                        </div>
                        <div className={`${style.text} ${style.bg} border ${style.border} px-6 py-3 rounded-2xl`}>
                            <div className="text-3xl font-black text-center">{grade}</div>
                            <div className="text-[10px] font-bold tracking-widest uppercase text-center mt-1 opacity-70">GRADE</div>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                        {data.summary && (
                            <div className={`p-4 rounded-xl border-l-4 ${style.border} bg-white/50 text-sm font-bold ${style.text} leading-relaxed shadow-sm`}>
                                <div className="flex items-center gap-2 mb-1 opacity-70">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase tracking-widest">AI 智慧健診摘要</span>
                                </div>
                                {data.summary}
                            </div>
                        )}
                        <div className="flex-1 min-h-[70px]">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">健康分數走勢 (近30日)</div>
                            <div className="w-full h-[60px]">
                                {history && history.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={60}>
                                        <AreaChart data={history} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={getScoreColor(overall)} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={getScoreColor(overall)} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                            <XAxis dataKey="date" hide />
                                            <YAxis domain={[0, 100]} hide />
                                            <Tooltip
                                                labelClassName="text-xs font-bold"
                                                contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => [`${value} 分`, '綜合評分']}
                                                labelFormatter={(label) => `日期: ${label}`}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke={getScoreColor(overall)}
                                                fillOpacity={1}
                                                fill="url(#colorScore)"
                                                strokeWidth={3}
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-[10px] text-slate-300 italic">
                                        尚無歷史趨勢資料
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-teal-600" /> 七維雷達圖
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                <Radar name="分數" dataKey="score" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-4 flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4 text-indigo-600" /> 各面向評分
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#475569' }} width={70} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                                    {barData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dimensions.map((dim, index) => {
                    const Icon = DIMENSION_ICONS[dim.name] || Shield;
                    const color = getScoreColor(dim.score);
                    const label = getScoreLabel(dim.score);
                    return (
                        <div key={index} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                                        <Icon className="w-4 h-4" style={{ color }} />
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{dim.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black tabular-nums" style={{ color }}>{dim.score}</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>{label}</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-2">
                                <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${dim.score}%`, backgroundColor: color }}></div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{dim.detail}</p>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-slate-900 p-2.5 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">存股健診指標清單</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Investment Quality Checklist</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {[
                        { label: '價格便宜程度', desc: '本益比或淨值比處於歷史低水位', checked: dimensions.find(d => d.name === '價值衡量')?.score >= 70, metric: `PE: ${metrics.pe || '--'}` },
                        { label: '公司獲利能力', desc: 'ROE 高於 15% 且毛利表現穩定', checked: dimensions.find(d => d.name === '獲利能力')?.score >= 70, metric: `ROE: ${metrics.latestROE ? metrics.latestROE + '%' : '--'}` },
                        { label: '營運動能成長', desc: '營收或 EPS 呈現長期增長趨勢', checked: dimensions.find(d => d.name === '成長能力')?.score >= 70, metric: `營收成長: ${data.revenue_growth ? data.revenue_growth + '%' : '--'}` },
                        { label: '財務安全穩健', desc: '負債比低，具備良好流動性', checked: dimensions.find(d => d.name === '安全性')?.score >= 70, metric: '風險: 低' },
                        { label: '籌碼優勢加持', desc: '法人近期明顯佈局且持股增加', checked: dimensions.find(d => d.name === '籌碼面')?.score >= 70, metric: `${metrics.totalBuy ? metrics.totalBuy + ' 張' : '法人持平'}` },
                        { label: '股利分配合理', desc: '殖利率具吸引力且穩定配息', checked: dimensions.find(d => d.name === '配息能力')?.score >= 70, metric: `殖利率: ${metrics.dy || '--'}%` }
                    ].map((item, idx) => (
                        <div key={idx} className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${item.checked ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 opacity-60'}`}>
                            <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${item.checked ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200'}`}>
                                {item.checked ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Circle className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                    <h4 className={`text-sm font-black ${item.checked ? 'text-emerald-900' : 'text-slate-500'}`}>{item.label}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.checked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{item.metric}</span>
                                </div>
                                <p className={`text-[11px] font-medium leading-tight ${item.checked ? 'text-emerald-600' : 'text-slate-400'}`}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    {[
                        { label: 'ROE', value: metrics?.latestROE ? `${Number(metrics.latestROE).toFixed(1)}%` : '--' },
                        { label: '毛利率', value: metrics?.latestGrossMargin ? `${Number(metrics.latestGrossMargin).toFixed(1)}%` : '--' },
                        { label: 'PE', value: metrics?.pe ? Number(metrics.pe).toFixed(1) : '--' },
                        { label: '殖利率', value: metrics?.dy ? `${Number(metrics.dy).toFixed(2)}%` : '--' },
                        { label: '法人買超', value: metrics?.totalBuy ? `${Number(metrics.totalBuy).toFixed(0)}張` : '--' }
                    ].map((m, i) => (
                        <div key={i}>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">{m.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
