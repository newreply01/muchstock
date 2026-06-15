import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Plus, Trash2, Search, Edit2, Check, X, ArrowUpRight } from 'lucide-react';
import { authFetch } from '../../utils/auth';
import StockSearchAutocomplete from '../forms/StockSearchAutocomplete';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function PortfolioDashboard({ onStockClick }) {
    const [holdings, setHoldings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPosition, setNewPosition] = useState({ symbol: '', quantity: '', avg_cost: '' });
    const [editingId, setEditingId] = useState(null);

    const fetchPortfolio = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/portfolio`);
            const data = await res.json();
            if (data.success) setHoldings(data.data);
        } catch (err) {
            console.error('Fetch portfolio failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    const handleAddPosition = async (e) => {
        e.preventDefault();
        if (!newPosition.symbol || !newPosition.quantity || !newPosition.avg_cost) return;

        try {
            const res = await authFetch(`${API_BASE}/portfolio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: newPosition.symbol,
                    quantity: parseFloat(newPosition.quantity),
                    avg_cost: parseFloat(newPosition.avg_cost)
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowAddForm(false);
                setNewPosition({ symbol: '', quantity: '', avg_cost: '' });
                fetchPortfolio();
            }
        } catch (err) {
            console.error('Add position failed', err);
        }
    };

    const handleDelete = async (symbol) => {
        if (!confirm(`確定要移除 ${symbol} 的持股記錄嗎？`)) return;
        try {
            const res = await authFetch(`${API_BASE}/portfolio/${symbol}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) fetchPortfolio();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const totalValue = holdings.reduce((sum, h) => sum + (h.current_price * h.quantity), 0);
    const totalCost = holdings.reduce((sum, h) => sum + (h.avg_cost * h.quantity), 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-gray-500 font-bold text-sm uppercase tracking-wider">
                        <PieChart className="w-4 h-4" /> 投資組合淨值
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-gray-50 flex items-baseline gap-2">
                        ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-sm font-medium text-gray-400 font-sans">TWD</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-gray-500 font-bold text-sm uppercase tracking-wider">
                        <DollarSign className="w-4 h-4" /> 累計總損益
                    </div>
                    <div className={`text-3xl font-black flex items-baseline gap-2 ${totalPnL >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <div className="flex items-center gap-1 text-sm font-bold bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 ml-2">
                            {totalPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {totalPnLPercent.toFixed(2)}%
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className="w-full h-full border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-sm font-bold"
                    >
                        <Plus className="w-6 h-6" />
                        新增持股記錄
                    </button>
                </div>
            </div>

            {/* Position Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-black text-gray-900 dark:text-gray-50 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-primary" />
                        當前持股明細
                    </h3>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Data Updated: {new Date().toLocaleDateString()}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4">標的名稱</th>
                                <th className="px-6 py-4">持有數量 (張/股)</th>
                                <th className="px-6 py-4">平均成本</th>
                                <th className="px-6 py-4">當前價格</th>
                                <th className="px-6 py-4">未實現損益</th>
                                <th className="px-6 py-4">損益率</th>
                                <th className="px-6 py-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
                                            <span className="text-sm font-bold text-gray-400">載入持股資料中...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : holdings.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                                                <TrendingUp className="w-8 h-8 text-gray-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-gray-900 dark:text-gray-50">尚無持股記錄</p>
                                                <p className="text-xs text-gray-400">點擊上方「新增」按鈕來開始追蹤您的投資組合損益。</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                holdings.map(h => (
                                    <tr key={h.symbol} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => onStockClick?.({ symbol: h.symbol, name: h.name })}
                                                className="flex flex-col text-left group/name"
                                            >
                                                <div className="font-black text-gray-900 dark:text-gray-50 text-sm group-hover/name:text-brand-primary transition-colors flex items-center gap-1">
                                                    {h.name}
                                                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/name:opacity-100 transition-all transform group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5" />
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400">{h.symbol}</div>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-sm text-gray-600">
                                            {Number(h.quantity).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-sm text-gray-600">
                                            ${Number(h.avg_cost).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono font-bold text-sm text-gray-900 dark:text-gray-50">${Number(h.current_price).toLocaleString()}</div>
                                            <div className={`text-[10px] font-bold ${h.daily_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {h.daily_change >= 0 ? '▲' : '▼'}{Math.abs(h.daily_change).toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 font-mono font-black text-sm ${h.unrealized_pnl >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {h.unrealized_pnl >= 0 ? '+' : ''}{Math.round(h.unrealized_pnl).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${h.pnl_percent >= 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                                {h.pnl_percent >= 0 ? '+' : ''}{Number(h.pnl_percent).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDelete(h.symbol)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="刪除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Form Modal Overlay */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 dark:text-gray-50 tracking-tight">新增持有倉位</h3>
                            <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddPosition} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">搜尋股票名稱或代號</label>
                                <StockSearchAutocomplete 
                                    onSelectStock={(stock) => {
                                        setNewPosition({
                                            ...newPosition,
                                            symbol: stock.symbol
                                        });
                                    }} 
                                />
                                {newPosition.symbol && (
                                    <div className="mt-1 px-1 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">
                                            已選擇: {newPosition.symbol}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => setNewPosition({...newPosition, symbol: ''})}
                                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 underline"
                                        >
                                            清除
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">持有數量</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="例如: 1000"
                                        value={newPosition.quantity}
                                        onChange={e => setNewPosition({...newPosition, quantity: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">平均成本</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-gray-50 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                                        placeholder="例如: 650"
                                        value={newPosition.avg_cost}
                                        onChange={e => setNewPosition({...newPosition, avg_cost: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                className="w-full bg-brand-primary hover:bg-red-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all mt-4"
                            >
                                確認新增此倉位
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
