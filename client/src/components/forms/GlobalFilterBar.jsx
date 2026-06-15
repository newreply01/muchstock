import React, { useState, useEffect } from 'react';
import useGlobalStore from '../../store/useGlobalStore';
import { Search, Building2 } from 'lucide-react';
import { getIndustries } from '../../utils/api';
import SearchableSelect from './SearchableSelect';

export default function GlobalFilterBar() {
    const { globalMarket: market, setGlobalMarket: setMarket, globalStockTypes, toggleGlobalStockType: toggleStockType, globalIndustry: industry, setGlobalIndustry: setIndustry } = useGlobalStore();
    const hasStockType = (typeId) => globalStockTypes.includes(typeId);
    const [industries, setIndustries] = useState([]);

    useEffect(() => {
        const fetchIndustries = async () => {
            try {
                const res = await getIndustries();
                // Sort industries alphabetically (Traditional Chinese)
                const sorted = (res || []).sort((a, b) => a.localeCompare(b, 'zh-TW'));
                setIndustries(sorted);
            } catch (err) {
                console.error('Failed to fetch industries', err);
            }
        };
        fetchIndustries();
    }, []);

    return (
        <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-gray-200 dark:border-slate-800">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 max-w-7xl mx-auto">

                {/* 1. Market Filter */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 min-w-max">市場</span>
                    <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800">
                        {[
                            { id: 'all', label: '全部' },
                            { id: 'twse', label: '上市' },
                            { id: 'tpex', label: '上櫃' }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMarket(m.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-black transition-all min-w-[55px]
                                    ${market === m.id
                                        ? 'bg-white dark:bg-slate-900 text-[#ea4335] shadow-sm font-black z-10 custom-market-active'
                                        : 'text-gray-500 font-bold hover:text-gray-800 dark:text-gray-100 hover:bg-white/50'
                                    }
                                `}
                                style={market === m.id ? { color: '#ea4335' } : {}}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-px h-8 bg-gray-200 mx-2"></div>

                {/* 2. Stock Types Filter */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#ea4335] flex items-center gap-1.5 min-w-max">
                        <Search className="w-4 h-4" />
                        標的類型
                    </span>
                    <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800">
                        {[
                            { id: 'stock', label: '股' },
                            { id: 'etf', label: 'ETF' }
                        ].map(type => {
                            const isSelected = hasStockType(type.id);
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => toggleStockType(type.id)}
                                    className={`px-3 py-2 rounded-lg text-sm transition-all min-w-[55px]
                                        ${isSelected
                                            ? 'bg-[#ea4335] text-white font-black shadow-md border border-red-600/20 hover:bg-[#d33426]'
                                            : 'text-gray-500 font-bold hover:bg-white dark:bg-slate-900 hover:text-gray-800 dark:text-gray-100'
                                        }
                                    `}
                                >
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden sm:block w-px h-8 bg-gray-200 mx-2"></div>

                {/* 3. Industry Filter */}
                <div className="flex items-center gap-3 relative z-20">
                    <span className="text-sm font-bold text-indigo-500 flex items-center gap-1.5 min-w-max">
                        <Building2 className="w-4 h-4" />
                        產業
                    </span>
                    <SearchableSelect
                        value={industry}
                        onChange={setIndustry}
                        options={industries}
                        allLabel="全產業"
                        className="w-full lg:w-[150px]"
                    />
                </div>

            </div>
        </div>
    );
}
