import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * A reusable Searchable Select component for premium UI.
 */
export default function SearchableSelect({ 
    options = [], 
    value = '', 
    onChange, 
    placeholder = '請選擇...', 
    allLabel = '全方位',
    className = "" 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Filter and sort options alphabetically
    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.localeCompare(b, 'zh-TW'));

    const currentLabel = value === 'all' || !value ? allLabel : value;

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset fields when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setHighlightedIndex(-1);
        } else {
            // Focus input when opened
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ') setIsOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % (filteredOptions.length + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + (filteredOptions.length + 1)) % (filteredOptions.length + 1));
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex === 0) {
                handleSelect('all');
            } else if (highlightedIndex > 0) {
                handleSelect(filteredOptions[highlightedIndex - 1]);
            }
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                className={`
                    flex items-center justify-between w-full px-4 py-2 bg-gray-50 border rounded-xl cursor-pointer transition-all
                    ${isOpen ? 'border-brand-primary ring-2 ring-red-500/10' : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-sm font-bold truncate ${value === 'all' || !value ? 'text-gray-400' : 'text-gray-700'}`}>
                        {currentLabel}
                    </span>
                </div>
                <div className="flex items-center gap-1 ml-2 text-gray-400">
                    {value !== 'all' && value && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleSelect('all'); }}
                            className="hover:text-red-500 p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`} />
                </div>
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Field */}
                    <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="搜尋產業名稱..."
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary placeholder:text-gray-400 font-medium"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
                        {/* "All" Option */}
                        {!searchTerm && (
                            <div
                                onClick={() => handleSelect('all')}
                                onMouseEnter={() => setHighlightedIndex(0)}
                                className={`
                                    flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm font-bold transition-colors
                                    ${value === 'all' || !value ? 'text-brand-primary bg-red-50' : 'text-gray-600 hover:bg-gray-50'}
                                    ${highlightedIndex === 0 ? 'bg-gray-50' : ''}
                                `}
                            >
                                <span>{allLabel}</span>
                                {(value === 'all' || !value) && <Check className="w-4 h-4" />}
                            </div>
                        )}

                        {/* Filtered Options */}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = value === opt;
                                const isHighlighted = highlightedIndex === (searchTerm ? idx : idx + 1);
                                return (
                                    <div
                                        key={opt}
                                        onClick={() => handleSelect(opt)}
                                        onMouseEnter={() => setHighlightedIndex(searchTerm ? idx : idx + 1)}
                                        className={`
                                            flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm font-bold transition-colors
                                            ${isSelected ? 'text-brand-primary bg-red-50' : 'text-gray-700 hover:bg-gray-50'}
                                            ${isHighlighted ? 'bg-gray-50' : ''}
                                        `}
                                    >
                                        <span>{opt}</span>
                                        {isSelected && <Check className="w-4 h-4" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-400 text-xs italic">
                                找不到匹配的產業
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
