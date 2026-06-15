import { useState, useEffect } from 'react'
import { BarChart3, ClipboardList, Building2, Calendar, Search, RotateCcw, LayoutGrid } from 'lucide-react';
import TechnicalFilters from './TechnicalFilters'
import FundamentalFilters from './FundamentalFilters'
import InstitutionalFilters from './InstitutionalFilters'

const TABS = [
    { id: 'technical', label: '技術指標', icon: BarChart3 },
    { id: 'fundamental', label: '基本財報', icon: ClipboardList },
    { id: 'institutional', label: '法人籌碼', icon: Building2 },
]

export default function FilterPanel({ onFilter, onClear, filters }) {
    const [activeTab, setActiveTab] = useState('technical')
    const [industries, setIndustries] = useState([])
    const [localFilters, setLocalFilters] = useState({
        market: 'all',
        industry: '',
        price_min: '', price_max: '',
        change_min: '', change_max: '',
        volume_min: '', volume_max: '',
        pe_min: '', pe_max: '',
        yield_min: '', yield_max: '',
        pb_min: '', pb_max: '',
        foreign_net_min: '', foreign_net_max: '',
        trust_net_min: '', trust_net_max: '',
        dealer_net_min: '', dealer_net_max: '',
        total_net_min: '', total_net_max: '',
        type_stock: true,
        type_stock: true,
        type_etf: false,
        ...filters
    })

    const updateFilter = (key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }))
    }

    useEffect(() => {
        fetch('/api/stocks/industries')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setIndustries(data);
            })
            .catch(err => console.error('Failed to load industries', err));
    }, []);

    const handleSubmit = () => {
        const cleaned = {}
        Object.entries(localFilters).forEach(([k, v]) => {
            if (k.startsWith('type_')) return; // Skip internal booleans
            if (v !== '' && v !== null && v !== undefined && v !== 'all') {
                cleaned[k] = v
            }
        })

        // Construct stock_types string
        const types = [];
        if (localFilters.type_stock) types.push('stock');
        if (localFilters.type_stock) types.push('stock');
        if (localFilters.type_etf) types.push('etf');
        if (types.length > 0) cleaned.stock_types = types.join(',');

        onFilter(cleaned)
    }

    const handleClear = () => {
        const empty = {
            market: 'all',
            industry: '',
            price_min: '', price_max: '',
            change_min: '', change_max: '',
            volume_min: '', volume_max: '',
            pe_min: '', pe_max: '',
            yield_min: '', yield_max: '',
            pb_min: '', pb_max: '',
            foreign_net_min: '', foreign_net_max: '',
            trust_net_min: '', trust_net_max: '',
            dealer_net_min: '', dealer_net_max: '',
            total_net_min: '', total_net_max: '',
            type_stock: true,
            type_stock: true,
            type_etf: false,
        }
        setLocalFilters(empty)
        onClear()
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 dark:border-slate-800 overflow-hidden sticky top-20 flex flex-col max-h-[calc(100vh-120px)]">
            {/* Sidebar Header */}
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand-primary rounded flex items-center justify-center">
                        <LayoutGrid className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-bold text-sm tracking-tight">篩選控制中心</span>
                </div>
                <button
                    onClick={handleClear}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="重置所有條件"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Vertical Tabs */}
            <div className="flex bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            className={`flex-1 py-4 px-2 flex flex-col items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all relative
                                ${isActive ? 'text-brand-primary bg-white dark:bg-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:bg-slate-800'}
                            `}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-brand-primary' : 'text-slate-300'}`} />
                            {tab.label}
                            {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-primary"></div>}
                        </button>
                    )
                })}
            </div>

            {/* Content Area - Scrollable */}
            <div className="p-5 flex-grow overflow-y-auto no-scrollbar space-y-8">
                {/* Global Context */}
                <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                            <span className="w-1 h-1 bg-brand-primary rounded-full"></span> 市場分類
                        </label>
                        <div className="flex gap-2">
                            {['all', 'twse', 'tpex'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => updateFilter('market', m)}
                                    className={`flex-1 py-2 text-[11px] font-bold border rounded transition-all uppercase
                                        ${localFilters.market === m
                                            ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'}
                                    `}
                                >
                                    {m === 'all' ? '全部' : (m === 'twse' ? '上市' : '上櫃')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                            <span className="w-1 h-1 bg-brand-primary rounded-full"></span> 標的類型
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'type_stock', label: '個股' },
                                { id: 'type_etf', label: 'ETF' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => updateFilter(t.id, !localFilters[t.id])}
                                    className={`py-2 text-[11px] font-bold border rounded transition-all
                                        ${localFilters[t.id]
                                            ? 'bg-brand-primary border-brand-primary text-white'
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'}
                                    `}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                            <Building2 className="w-3 h-3" /> 產業類別
                        </label>
                        <select
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                            value={localFilters.industry || ''}
                            onChange={e => updateFilter('industry', e.target.value)}
                        >
                            <option value="">全部產業</option>
                            {industries.map(ind => (
                                <option key={ind} value={ind}>{ind}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                            <Calendar className="w-3 h-3" /> 資料日期
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                                value={localFilters.date || ''}
                                onChange={e => updateFilter('date', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {activeTab === 'technical' && <TechnicalFilters filters={localFilters} onChange={updateFilter} />}
                    {activeTab === 'fundamental' && <FundamentalFilters filters={localFilters} onChange={updateFilter} />}
                    {activeTab === 'institutional' && <InstitutionalFilters filters={localFilters} onChange={updateFilter} />}
                </div>
            </div>

            {/* Sidebar Footer / Action */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800">
                <button
                    className="w-full bg-brand-primary hover:bg-red-600 text-white py-3.5 rounded-lg flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-widest shadow-[0_10px_20px_rgba(238,49,36,0.3)] hover:-translate-y-0.5"
                    onClick={handleSubmit}
                >
                    <Search className="w-4 h-4 stroke-[3px]" />
                    執行智能選股
                </button>
            </div>
        </div>
    )
}
