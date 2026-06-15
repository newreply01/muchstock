import React, { useState, useCallback, useEffect } from 'react';
import { Search, BarChart3, TrendingUp, TrendingDown, Minus, RefreshCcw, AlertTriangle, ShieldCheck, Activity, DollarSign, Users, Zap, Info, ChevronDown, ChevronUp, Plus, Trash2, Wallet, Settings, X, Save, History } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { analyzePositionAPI, analyzeBatchPositions, getAnalysisSettings, updateAnalysisSettings, getPositionHistory } from '../../utils/api';
import StockSearchAutocomplete from '../forms/StockSearchAutocomplete';

const SIGNAL_CONFIG = {
    STRONG_BUY:  { label: '強力推薦', color: '#16a34a', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: TrendingUp },
    BUY:         { label: '買進/加碼', color: '#22c55e', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: TrendingUp },
    HOLD:        { label: '持有/觀望', color: '#eab308', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Minus },
    SELL:        { label: '減碼/注意', color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: TrendingDown },
    STRONG_SELL: { label: '建議賣出', color: '#ef4444', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: TrendingDown },
    ERROR:       { label: '分析失敗', color: '#94a3b8', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-500', icon: AlertTriangle }
};

const DIM_META = {
    technical:    { label: '技術面', icon: Activity, color: '#6366f1' },
    fundamental:  { label: '基本面', icon: DollarSign, color: '#0ea5e9' },
    chip:         { label: '籌碼面', icon: Users, color: '#f59e0b' },
    momentum:     { label: '動能面', icon: Zap, color: '#10b981' }
};

function ScoreGauge({ score, size = 100 }) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = score >= 70 ? '#16a34a' : score >= 45 ? '#eab308' : '#ef4444';

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                    strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <span className="absolute text-xl font-black" style={{ color }}>{score}</span>
        </div>
    );
}

function DimensionCard({ dimKey, data }) {
    const [expanded, setExpanded] = useState(false);
    const meta = DIM_META[dimKey];
    if (!meta) return null;
    const Icon = meta.icon;
    const score = data.score;
    const barColor = score >= 70 ? 'bg-green-500' : score >= 45 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: meta.color + '15' }}>
                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-bold text-slate-700">{meta.label}</div>
                        <div className="text-xs text-slate-400">權重 {data.weight * 100}%</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div className={`h-2 rounded-full ${barColor} transition-all duration-700`} style={{ width: `${score}%` }} />
                    </div>
                    <span className="text-lg font-black" style={{ color: meta.color }}>{score}</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>
            {expanded && data.details && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 space-y-2">
                    {Object.entries(data.details).map(([key, val]) => {
                        if (key === 'note') return <p key={key} className="text-xs text-slate-400 italic">{val}</p>;
                        if (typeof val !== 'object') return null;
                        return (
                            <div key={key} className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">{key}</span>
                                <div className="flex items-center gap-2">
                                    {val.value !== undefined && <span className="text-slate-600">{typeof val.value === 'number' ? val.value.toFixed(2) : val.value}</span>}
                                    {val.score !== undefined && (
                                        <span className={`px-1.5 py-0.5 rounded font-bold ${val.score >= 60 ? 'bg-green-100 text-green-700' : val.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {val.score}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ResultCard({ result, onSelect, isSelected }) {
    const config = SIGNAL_CONFIG[result.signal] || SIGNAL_CONFIG.ERROR;
    const SignalIcon = config.icon;
    const h = result.holding;
    // Calculate unrealized P&L if holding data is provided
    let pnl = null, pnlPct = null, currentPrice = null;
    if (h && h.avgCost > 0 && result.dimensions?.momentum?.details?.return5d) {
        // We'll use the momentum details to get an approximate current price direction
    }
    // Try to get currentPrice from technical details
    if (result.dimensions?.technical?.details?.priceVsMa20?.price) {
        currentPrice = result.dimensions.technical.details.priceVsMa20.price;
    }
    if (h && h.avgCost > 0 && currentPrice) {
        pnl = (currentPrice - h.avgCost) * h.shares;
        pnlPct = ((currentPrice - h.avgCost) / h.avgCost * 100).toFixed(2);
    }

    return (
        <button
            onClick={() => onSelect(result)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${isSelected ? 'border-indigo-400 bg-indigo-50/50 shadow-md' : `${config.border} ${config.bg}`}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-800 dark:text-slate-100">{result.symbol}</span>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                        <SignalIcon className="w-3 h-3" />{config.label}
                    </span>
                </div>
                <ScoreGauge score={result.composite} size={52} />
            </div>
            {/* Holdings P&L */}
            {h && h.avgCost > 0 && currentPrice && (
                <div className="mt-1 mb-2 flex items-center gap-3 text-xs">
                    <span className="text-slate-400">{h.shares}股 @ {h.avgCost}</span>
                    <span className="text-slate-400">現價 {currentPrice.toFixed(2)}</span>
                    {pnl !== null && (
                        <span className={`font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toLocaleString()} ({pnl >= 0 ? '+' : ''}{pnlPct}%)
                        </span>
                    )}
                </div>
            )}
            {result.dimensions && (
                <div className="flex gap-1 mt-1">
                    {Object.entries(result.dimensions).map(([key, dim]) => (
                        <div key={key} className="flex-1 text-center">
                            <div className="text-[9px] text-slate-400 font-bold">{DIM_META[key]?.label}</div>
                            <div className="text-xs font-black text-slate-600">{dim.score}</div>
                        </div>
                    ))}
                </div>
            )}
        </button>
    );
}

// ============ 權重設定面板 ============
function WeightSettingsPanel({ isOpen, onClose }) {
    const [weights, setWeights] = useState({
        tech_weight: 0.30, fund_weight: 0.25, chip_weight: 0.25, mom_weight: 0.20
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (isOpen && !loaded) {
            getAnalysisSettings().then(res => {
                if (res.success) setWeights(res.data);
                setLoaded(true);
            }).catch(() => setLoaded(true));
        }
    }, [isOpen]);

    const labels = [
        { key: 'tech_weight', label: '技術面', color: '#6366f1', icon: Activity },
        { key: 'fund_weight', label: '基本面', color: '#0ea5e9', icon: DollarSign },
        { key: 'chip_weight', label: '籌碼面', color: '#f59e0b', icon: Users },
        { key: 'mom_weight', label: '動能面', color: '#10b981', icon: Zap }
    ];

    const total = labels.reduce((s, l) => s + (parseFloat(weights[l.key]) || 0), 0);
    const isValid = Math.abs(total - 1) <= 0.05;

    const handleChange = (key, value) => {
        setWeights(prev => ({ ...prev, [key]: parseFloat(value) }));
        setMessage(null);
    };

    const handleSave = async () => {
        if (!isValid) { setMessage({ type: 'error', text: '權重總和必須為 100%' }); return; }
        setSaving(true);
        try {
            const res = await updateAnalysisSettings(weights);
            if (res.success) {
                setMessage({ type: 'success', text: '權重設定已儲存！重新分析即可套用' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setWeights({ tech_weight: 0.30, fund_weight: 0.25, chip_weight: 0.25, mom_weight: 0.20 });
        setMessage(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md mx-4 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">評分權重設定</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {labels.map(({ key, label, color, icon: Icon }) => {
                        const pct = Math.round((parseFloat(weights[key]) || 0) * 100);
                        return (
                            <div key={key} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" style={{ color }} />
                                        <span className="text-sm font-bold text-slate-700">{label}</span>
                                    </div>
                                    <span className="text-sm font-black tabular-nums" style={{ color }}>{pct}%</span>
                                </div>
                                <input
                                    type="range" min={0} max={0.6} step={0.05}
                                    value={weights[key]}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                    style={{ accentColor: color }}
                                />
                            </div>
                        );
                    })}

                    <div className={`flex items-center justify-between p-3 rounded-xl border ${
                        isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                        <span className="text-xs font-bold text-slate-500">權重總和</span>
                        <span className={`text-sm font-black ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.round(total * 100)}%{isValid ? ' ✓' : ' (需 100%)'}
                        </span>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-xl text-sm font-bold ${
                            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {message.text}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={handleReset}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors">
                        還原預設
                    </button>
                    <button onClick={handleSave} disabled={saving || !isValid}
                        className="flex-1 px-4 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center justify-center gap-2 transition-colors">
                        {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        儲存設定
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ 歷史評分走勢圖 ============
function ScoreHistoryChart({ symbol }) {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        getPositionHistory(symbol, 30).then(res => {
            if (res.success) setHistoryData(res.data);
        }).catch(() => {}).finally(() => setLoading(false));
    }, [symbol]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex items-center justify-center h-48">
                <RefreshCcw className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
        );
    }

    if (historyData.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-black text-slate-600">歷史評分走勢</h4>
                </div>
                <p className="text-xs text-slate-400 text-center py-6">
                    尚無歷史評分資料。執行每日掃描後即可查看趨勢。
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-black text-slate-600">歷史評分走勢（近 {historyData.length} 日）</h4>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                        formatter={(value, name) => [parseFloat(value).toFixed(1), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <ReferenceLine y={70} stroke="#16a34a" strokeDasharray="5 5" label={{ value: '買進', position: 'insideTopRight', fontSize: 10, fill: '#16a34a' }} />
                    <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '賣出', position: 'insideBottomRight', fontSize: 10, fill: '#ef4444' }} />
                    <Line type="monotone" dataKey="overall_score" name="綜合" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="tech_score" name="技術" stroke="#818cf8" strokeWidth={1} dot={false} opacity={0.5} />
                    <Line type="monotone" dataKey="fund_score" name="基本" stroke="#0ea5e9" strokeWidth={1} dot={false} opacity={0.5} />
                    <Line type="monotone" dataKey="chip_score" name="籌碼" stroke="#f59e0b" strokeWidth={1} dot={false} opacity={0.5} />
                    <Line type="monotone" dataKey="mom_score" name="動能" stroke="#10b981" strokeWidth={1} dot={false} opacity={0.5} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function PositionAnalysis() {
    // holdings: { symbol, shares, avgCost, name }
    const [holdings, setHoldings] = useState(() => {
        try {
            const saved = localStorage.getItem('position-analysis-holdings');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [analysisResults, setAnalysisResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    // Persist holdings
    const updateHoldings = (newHoldings) => {
        setHoldings(newHoldings);
        localStorage.setItem('position-analysis-holdings', JSON.stringify(newHoldings));
    };

    const addHolding = (stock) => {
        if (!stock || !stock.symbol) return;
        if (holdings.find(h => h.symbol === stock.symbol)) return;
        updateHoldings([...holdings, { symbol: stock.symbol, name: stock.name, shares: 1000, avgCost: 0 }]);
    };

    const updateHoldingField = (symbol, field, value) => {
        updateHoldings(holdings.map(h => h.symbol === symbol ? { ...h, [field]: value } : h));
    };

    const removeHolding = (symbol) => {
        updateHoldings(holdings.filter(h => h.symbol !== symbol));
        if (selectedResult?.symbol === symbol) setSelectedResult(null);
    };

    const runAnalysis = async () => {
        if (holdings.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const symbols = holdings.map(h => h.symbol);
            const res = await analyzeBatchPositions(symbols);
            if (res.success) {
                // Merge holdings data into results
                const merged = res.data.map(r => {
                    const h = holdings.find(hh => hh.symbol === r.symbol);
                    return { ...r, holding: h || null };
                });
                setAnalysisResults(merged);
                if (merged.length > 0) setSelectedResult(merged[0]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const radarData = selectedResult?.dimensions ? Object.entries(selectedResult.dimensions).map(([key, dim]) => ({
        dimension: DIM_META[key]?.label || key,
        score: dim.score,
        fullMark: 100
    })) : [];

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-indigo-200/50">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">持倉分析</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">多因子評分 · 進出場建議</p>
                    </div>
                </div>
                <button onClick={() => setShowSettings(true)}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:bg-slate-800 hover:border-indigo-200 transition-all shadow-sm group"
                    title="自訂評分權重">
                    <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>
            </div>

            {/* Weight Settings Modal */}
            <WeightSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

            {/* Holdings Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-indigo-500" />我的持倉
                    </h3>
                    <span className="text-xs text-slate-400">共 {holdings.length} 檔股票</span>
                </div>

                {/* Search to add */}
                <div className="w-full relative z-20">
                    <StockSearchAutocomplete onSelectStock={addHolding} />
                </div>

                {/* Holdings table */}
                {holdings.length > 0 && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                                        <th className="text-left py-2 px-2">股票</th>
                                        <th className="text-left py-2 px-2">名稱</th>
                                        <th className="text-right py-2 px-2">持有股數</th>
                                        <th className="text-right py-2 px-2">平均成本</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.map(h => (
                                        <tr key={h.symbol} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-2 px-2 font-black text-slate-800 dark:text-slate-100">{h.symbol}</td>
                                            <td className="py-2 px-2 text-slate-500 text-xs">{h.name || '-'}</td>
                                            <td className="py-2 px-2 text-right">
                                                <input type="number" value={h.shares} min={0}
                                                    onChange={(e) => updateHoldingField(h.symbol, 'shares', parseInt(e.target.value) || 0)}
                                                    className="w-24 text-right border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-200" />
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                                <input type="number" value={h.avgCost} min={0} step={0.1}
                                                    onChange={(e) => updateHoldingField(h.symbol, 'avgCost', parseFloat(e.target.value) || 0)}
                                                    className="w-24 text-right border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-200" />
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <button onClick={() => removeHolding(h.symbol)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={runAnalysis} disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-black px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all">
                            {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                            {loading ? '分析中...' : `開始分析 (${holdings.length} 檔)`}
                        </button>
                    </>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 text-sm font-bold">
                    <AlertTriangle className="w-5 h-5" />{error}
                </div>
            )}

            {/* Results */}
            {analysisResults.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Results list */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-black text-slate-600 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-500" />分析結果 ({analysisResults.length})
                        </h3>
                        {analysisResults.map(r => (
                            <ResultCard key={r.symbol} result={r} onSelect={setSelectedResult} isSelected={selectedResult?.symbol === r.symbol} />
                        ))}
                    </div>

                    {/* Right: Detailed view */}
                    {selectedResult && selectedResult.dimensions && (
                        <div className="lg:col-span-2 space-y-4">
                            {/* Composite score header */}
                            <div className={`rounded-2xl border-2 p-6 ${SIGNAL_CONFIG[selectedResult.signal]?.bg} ${SIGNAL_CONFIG[selectedResult.signal]?.border}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{selectedResult.symbol}</h3>
                                        <p className={`text-lg font-black mt-1 ${SIGNAL_CONFIG[selectedResult.signal]?.text}`}>
                                            {selectedResult.recommendation}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2">分析時間：{new Date(selectedResult.analyzedAt).toLocaleString('zh-TW')}</p>
                                    </div>
                                    <ScoreGauge score={selectedResult.composite} size={120} />
                                </div>
                            </div>

                            {/* Radar chart + Dimensions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                                    <h4 className="text-sm font-black text-slate-600 mb-3">四維雷達圖</h4>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <RadarChart data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                                            <Radar name="評分" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                                            <Tooltip formatter={(value) => [`${value} 分`, '評分']} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-black text-slate-600">維度明細</h4>
                                    {Object.entries(selectedResult.dimensions).map(([key, dim]) => (
                                        <DimensionCard key={key} dimKey={key} data={dim} />
                                    ))}
                                </div>
                            </div>

                            {/* Score History Chart */}
                            <ScoreHistoryChart symbol={selectedResult.symbol} />


                            {/* Disclaimer */}
                            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start gap-2">
                                <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    本系統僅供參考，不構成任何投資建議。投資人應獨立判斷，自負盈虧。過去績效不代表未來表現。
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {analysisResults.length === 0 && !loading && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
                    <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-500">開始持倉分析</h3>
                    <p className="text-sm text-slate-400 mt-2">在上方搜尋框加入股票，然後點擊「開始分析」</p>
                    <p className="text-xs text-slate-300 mt-4">系統將從技術面、基本面、籌碼面、動能面四個維度進行綜合評分</p>
                </div>
            )}
        </div>
    );
}
