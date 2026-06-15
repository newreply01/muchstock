export default function RangeInput({ label, minKey, maxKey, filters, onChange, placeholder = '' }) {
    return (
        <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
            <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded divide-x divide-slate-200 focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all">
                <input
                    className="w-full bg-transparent px-3 py-2 text-sm text-brand-dark placeholder-slate-300 outline-none font-medium tabular-nums"
                    type="number"
                    placeholder={placeholder || 'Min'}
                    value={filters[minKey]}
                    onChange={e => onChange(minKey, e.target.value)}
                />
                <div className="px-2 text-slate-300 pointer-events-none select-none text-[10px] font-bold bg-slate-100/50">至</div>
                <input
                    className="w-full bg-transparent px-3 py-2 text-sm text-brand-dark placeholder-slate-300 outline-none font-medium tabular-nums"
                    type="number"
                    placeholder={placeholder || 'Max'}
                    value={filters[maxKey]}
                    onChange={e => onChange(maxKey, e.target.value)}
                />
            </div>
        </div>
    )
}
