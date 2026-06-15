import React, { useRef, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, Info, TrendingUp, TrendingDown, Layers, Search, Star, FileText, FileSpreadsheet, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const COLUMNS = [
    { key: 'symbol', label: '代號', sortable: true },
    { key: 'name', label: '名稱', sortable: false },
    { key: 'candlestick', label: 'K-棒', sortable: false },
    { key: 'close_price', label: '收盤', sortable: true },
    { key: 'change_percent', label: '漲跌%', sortable: true },
    { key: 'volume', label: '成交量', sortable: true },
    { key: 'pe_ratio', label: '本益比', sortable: true },
    { key: 'dividend_yield', label: '殖利率', sortable: true },
    { key: 'pb_ratio', label: '淨值比', sortable: true },
    { key: 'foreign_net', label: '外資', sortable: true },
    { key: 'trust_net', label: '投信', sortable: true },
    { key: 'dealer_net', label: '自營', sortable: true },
    { key: 'total_net', label: '合計', sortable: true },
]

function formatNumber(val, decimals = 0) {
    if (val === null || val === undefined) return '-'
    return Number(val).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })
}

function formatVolume(val) {
    if (val === null || val === undefined) return '-'
    const num = Number(val)
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '億'
    if (num >= 10000) return (num / 10000).toFixed(0) + '萬'
    return num.toLocaleString()
}

function formatInstitutional(val) {
    if (val === null || val === undefined) return '-'
    const num = Number(val)
    const colorClass = num > 0 ? 'text-brand-danger' : (num < 0 ? 'text-brand-success' : 'text-slate-500');

    let text = num.toLocaleString();
    if (Math.abs(num) >= 100000000) text = (num / 100000000).toFixed(1) + '億';
    else if (Math.abs(num) >= 10000) text = (num / 10000).toFixed(0) + '萬';

    return <span className={`font-bold tabular-nums ${colorClass}`}>{text}</span>
}

function formatCell(key, value, row, isWatched, onToggleWatchlist) {
    switch (key) {
        case 'symbol':
            return (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleWatchlist && onToggleWatchlist(row.symbol); }}
                            className="focus:outline-none"
                        >
                            <Star className={`w-4 h-4 transition-colors ${isWatched ? 'fill-yellow-400 text-yellow-500' : 'text-slate-300 hover:text-yellow-400'}`} />
                        </button>
                        <span className="font-black text-brand-dark tracking-tighter text-sm group-hover:text-brand-primary transition-colors">{value}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-sm w-fit mt-1 ml-6
                        ${row.market === 'twse' ? 'text-blue-500 bg-blue-50' : 'text-orange-500 bg-orange-50'}`}>
                        {row.market === 'twse' ? 'TWSE 上市' : 'TPEX 上櫃'}
                    </span>
                </div>
            )
        case 'candlestick': {
            const open = parseFloat(row.open_price);
            const high = parseFloat(row.high_price);
            const low = parseFloat(row.low_price);
            const close = parseFloat(row.close_price);

            if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) return '-';

            const isUp = close >= open;
            const color = isUp ? '#ef4444' : '#22c55e'; // Red for up, Green for down

            // Scaled heights for a 16x24 SVG
            const range = high - low;
            if (range === 0) return <div className="w-4 h-6 border-b border-slate-300"></div>; // Flat line

            const h = 24;
            const yHigh = 0;
            const yLow = h;
            const yOpen = h - ((open - low) / range) * h;
            const yClose = h - ((close - low) / range) * h;

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);

            return (
                <div className="flex justify-center">
                    <svg width="12" height="24" viewBox="0 0 12 24" className="overflow-visible">
                        {/* Upper Wick */}
                        <line x1="6" y1="0" x2="6" y2={bodyTop} stroke={color} strokeWidth="1" />
                        {/* Body */}
                        <rect x="2" y={bodyTop} width="8" height={bodyHeight} fill={color} />
                        {/* Lower Wick */}
                        <line x1="6" y1={bodyTop + bodyHeight} x2="6" y2="24" stroke={color} strokeWidth="1" />
                    </svg>
                </div>
            );
        }
        case 'name':
            return (
                <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-700 truncate block max-w-[120px]">{value}</span>
                    {row.industry && (
                        <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm w-fit bg-indigo-50 text-indigo-500 border border-indigo-100/50">
                            {row.industry}
                        </span>
                    )}
                </div>
            )
        case 'close_price':
            return <span className="font-black text-slate-900 dark:text-slate-50 tabular-nums">{formatNumber(value, 2)}</span>
        case 'change_percent': {
            if (value === null || value === undefined) return '-'
            const num = Number(value)
            const isUp = num > 0;
            const isDown = num < 0;
            const colorClass = isUp ? 'bg-brand-danger/10 text-brand-danger' : (isDown ? 'bg-brand-success/10 text-brand-success' : 'bg-slate-100 dark:bg-slate-800 text-slate-500');
            return (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-black text-xs tabular-nums ${colorClass}`}>
                    {isUp && <TrendingUp className="w-3 h-3" />}
                    {isDown && <TrendingDown className="w-3 h-3" />}
                    <span>{num > 0 ? '+' : ''}{num.toFixed(2)}%</span>
                </div>
            )
        }
        case 'volume':
            return <span className="text-slate-500 font-bold tabular-nums">{formatVolume(value)}</span>
        case 'pe_ratio':
        case 'pb_ratio':
            return <div className="flex flex-col">
                <span className="text-slate-700 font-bold tabular-nums text-xs">{formatNumber(value, 2)}</span>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">MULTIPLE</span>
            </div>
        case 'dividend_yield':
            return value != null ? <span className="text-indigo-600 font-black tabular-nums">{Number(value).toFixed(2)}%</span> : '-'
        case 'foreign_net':
        case 'trust_net':
        case 'dealer_net':
        case 'total_net':
            return formatInstitutional(value)
        default:
            return <span className="font-medium text-slate-600">{value ?? '-'}</span>
    }
}

export default function ResultTable({ results, loading, sortBy, sortDir, onSort, page, onPageChange, onStockClick, watchedSymbols, onToggleWatchlist, onCompare }) {
    const { data, total, totalPages, latestDate } = results
    const tableRef = useRef(null);
    const [compareSymbols, setCompareSymbols] = useState(new Set());

    const toggleCompare = (e, symbol) => {
        e.stopPropagation();
        setCompareSymbols(prev => {
            const newSet = new Set(prev);
            if (newSet.has(symbol)) {
                newSet.delete(symbol);
            } else {
                if (newSet.size >= 5) {
                    alert('最多只能同時比較 5 檔股票');
                    return prev;
                }
                newSet.add(symbol);
            }
            return newSet;
        });
    };

    const handleCompareClick = () => {
        if (compareSymbols.size < 2) {
            alert('請至少勾選 2 檔股票進行比較');
            return;
        }
        if (onCompare) {
            onCompare(Array.from(compareSymbols));
            // Optional: clear selection after comparing
            // setCompareSymbols(new Set());
        }
    };

    const handleExportExcel = () => {
        console.log(">>> [EXCEL] handleClick triggered, data length:", data?.length);
        try {
            if (!data || data.length === 0) {
                alert('沒有資料可供匯出');
                return;
            }

            console.log(">>> [EXCEL] Mapping data...");
            const exportData = data.map(row => ({
                '代號': row.symbol,
                '名稱': row.name,
                '市場': row.market === 'twse' ? '上市' : '上櫃',
                '收盤': row.close_price,
                '漲跌%': row.change_percent,
                '成交量': row.volume,
                '本益比': row.pe_ratio,
                '殖利率': row.dividend_yield,
                '淨值比': row.pb_ratio,
                '外資買賣超': row.foreign_net,
                '投信買賣超': row.trust_net,
                '自營買賣超': row.dealer_net,
                '合計買賣超': row.total_net
            }));

            console.log(">>> [EXCEL] Creating worksheet...");
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Screener Results");

            console.log(">>> [EXCEL] Generating buffer...");
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });

            console.log(">>> [EXCEL] Triggering download natively...");
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `StockScreener_${latestDate || 'Export'}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(">>> [EXCEL] Export finished.");
        } catch (error) {
            console.error('>>> [EXCEL] Export failed:', error);
            alert('Excel 匯出發生錯誤: ' + error.message);
        }
    };

    const handleExportPDF = async () => {
        console.log(">>> [PDF] handleClick triggered, tableRef:", !!tableRef.current);
        if (!tableRef.current) {
            alert('找不到表格內容，請稍後再試。');
            return;
        }
        try {
            console.log(">>> [PDF] Starting html2canvas...");
            const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true, logging: false });

            console.log(">>> [PDF] Converting to image data...");
            const imgData = canvas.toDataURL('image/png');

            console.log(">>> [PDF] Creating jsPDF instance...");
            const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for tables
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            console.log(">>> [PDF] Adding image and saving...");
            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`StockScreener_Report_${latestDate || 'Export'}.pdf`);
            console.log(">>> [PDF] Export finished.");
        } catch (error) {
            console.error('>>> [PDF] Export failed:', error);
            alert('PDF 匯出發生錯誤: ' + error.message);
        }
    };

    return (
        <div className="relative flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 min-h-[500px]">
            {loading && (
                <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-20 w-20 border-[3px] border-slate-100 dark:border-slate-800 border-t-brand-primary"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 bg-brand-primary rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <div className="mt-8 text-brand-dark font-black uppercase tracking-[0.2em] text-sm italic">Synchronizing Data...</div>
                    <div className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Applying financial filters</div>
                </div>
            )}
            {/* Header Info Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-brand-primary/10 p-3 rounded-xl border border-brand-primary/20">
                        <Layers className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-brand-dark tabular-nums tracking-tighter">{Number(total).toLocaleString()}</span>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400 pt-1">STOCKS MATCHED</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">顯示市場中所有符合目前過濾條件的標的</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block mx-2"></div>
                    <div className="flex-1 md:flex-none">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">系統最後同步時間</div>
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-black text-sm tabular-nums">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{latestDate || '---'}</span>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-800/50">
                        <button
                            onClick={handleExportExcel}
                            className="bg-white dark:bg-slate-900 text-green-700 hover:text-green-800 hover:bg-green-50 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 border border-slate-200 dark:border-slate-800/50"
                            title="匯出本頁資料至 Excel"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> EXCEL
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="text-red-600 hover:text-red-700 hover:bg-white/80 hover:shadow-sm px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                            title="匯出本頁報表至 PDF"
                        >
                            <FileText className="w-4 h-4" /> PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Compare Action Bar (Conditional) */}
            {compareSymbols.size > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <BarChart2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-900">已選取 {compareSymbols.size} 檔標的</p>
                            <div className="text-xs font-medium text-indigo-600/80 mt-0.5 max-w-xl truncate">
                                {Array.from(compareSymbols).join(', ')}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCompareSymbols(new Set())}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                            清除選取
                        </button>
                        <button
                            onClick={handleCompareClick}
                            disabled={compareSymbols.size < 2}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-black transition-all shadow-sm"
                        >
                            比較走勢
                        </button>
                    </div>
                </div>
            )}

            {/* Main Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto relative no-scrollbar">
                    {data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                            <div className="relative mb-8">
                                <Search className="w-24 h-24 stroke-[1px] opacity-20" />
                                <div className="absolute top-0 right-0 w-8 h-8 bg-brand-primary/10 rounded-full animate-ping"></div>
                            </div>
                            <div className="text-xl font-black text-slate-900 dark:text-slate-50 uppercase tracking-widest italic">NO ASSETS FOUND</div>
                            <p className="text-xs font-bold uppercase tracking-tighter mt-3 text-slate-400">請嘗試調整您的篩選閾值或切換市場板塊</p>
                        </div>
                    ) : (
                        <div ref={tableRef} className="bg-white dark:bg-slate-900">
                            {/* Hidden header for PDF export only */}
                            <div className="hidden export-pdf-header p-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">MuchStock 智能選股報表</h1>
                                <p className="text-sm text-slate-500 font-bold mt-1">資料基準日: {latestDate}</p>
                            </div>
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
                                    <tr>
                                        <th className="py-5 px-6 whitespace-nowrap w-12 text-center">
                                            比較
                                        </th>
                                        {COLUMNS.map(col => {
                                            const isSecondary = ['candlestick', 'pe_ratio', 'dividend_yield', 'pb_ratio', 'foreign_net', 'trust_net', 'dealer_net', 'total_net'].includes(col.key);
                                            return (
                                                <th
                                                    key={col.key}
                                                    className={`py-5 px-6 whitespace-nowrap cursor-pointer transition-all hover:bg-slate-100 dark:bg-slate-800 group 
                                                        ${sortBy === col.key ? 'text-brand-primary bg-brand-primary/[0.02]' : ''}
                                                        ${isSecondary ? 'hidden md:table-cell' : ''}`}
                                                    onClick={() => col.sortable && onSort(col.key)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {col.label}
                                                        {col.sortable && (
                                                            <div className={`transition-colors ${sortBy === col.key ? 'text-brand-primary' : 'text-slate-200 group-hover:text-slate-400'}`}>
                                                                {sortBy === col.key ? (sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.map((row, idx) => (
                                        <tr
                                            key={row.symbol || idx}
                                            onClick={() => onStockClick && onStockClick(row)}
                                            className="hover:bg-brand-primary/[0.03] transition-all group/row cursor-pointer border-b border-slate-50 last:border-0"
                                        >
                                            <td className="py-4 px-6 whitespace-nowrap text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={compareSymbols.has(row.symbol)}
                                                    onChange={(e) => toggleCompare(e, row.symbol)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </td>
                                            {COLUMNS.map(col => {
                                                const isSecondary = ['candlestick', 'pe_ratio', 'dividend_yield', 'pb_ratio', 'foreign_net', 'trust_net', 'dealer_net', 'total_net'].includes(col.key);
                                                return (
                                                    <td
                                                        key={col.key}
                                                        className={`py-4 px-6 whitespace-nowrap transition-all 
                                                            ${sortBy === col.key ? 'bg-brand-primary/[0.01]' : ''}
                                                            ${isSecondary ? 'hidden md:table-cell' : ''}`}
                                                    >
                                                        {formatCell(col.key, row[col.key], row, watchedSymbols?.has(row.symbol), onToggleWatchlist)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Aesthetic Pagination */}
                {totalPages > 1 && (
                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Results View:</span>
                            <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg">
                                <span className="px-3 py-1 text-[11px] font-black text-brand-dark">PAGE {page}</span>
                                <span className="px-2 py-1 text-[11px] font-bold text-slate-300">OF {totalPages}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-brand-primary hover:border-brand-primary disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 dark:border-slate-800 transition-all font-black"
                                disabled={page <= 1}
                                onClick={() => onPageChange(1)}
                            >
                                «
                            </button>
                            <button
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-brand-primary hover:border-brand-primary disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 dark:border-slate-800 transition-all font-black"
                                disabled={page <= 1}
                                onClick={() => onPageChange(page - 1)}
                            >
                                ‹
                            </button>

                            <div className="flex gap-2 mx-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let p = page - 2 + i;
                                    if (page <= 2) p = 1 + i;
                                    if (page >= totalPages - 2) p = totalPages - 4 + i;
                                    if (p < 1) p = 1;
                                    if (totalPages < 5) p = i + 1;

                                    if (p > 0 && p <= totalPages) {
                                        return (
                                            <button
                                                key={p}
                                                className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all shadow-sm
                                                    ${page === p ? 'bg-brand-dark text-white ring-4 ring-slate-900/5 scale-110 z-10' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-slate-300'}
                                                `}
                                                onClick={() => onPageChange(p)}
                                            >
                                                {String(p).padStart(2, '0')}
                                            </button>
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-brand-primary hover:border-brand-primary disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 dark:border-slate-800 transition-all font-black"
                                disabled={page >= totalPages}
                                onClick={() => onPageChange(page + 1)}
                            >
                                ›
                            </button>
                            <button
                                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-brand-primary hover:border-brand-primary disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 dark:border-slate-800 transition-all font-black"
                                disabled={page >= totalPages}
                                onClick={() => onPageChange(totalPages)}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
