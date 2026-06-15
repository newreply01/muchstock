import RangeInput from './RangeInput';
import { AreaChart } from 'lucide-react';

export default function FundamentalFilters({ filters, onChange }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both">
            <div className="space-y-0 relative">
                <div className="absolute -left-4 top-1 w-1 h-4 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(238,49,36,0.5)]"></div>
                <h3 className="font-extrabold text-brand-dark text-xs uppercase tracking-widest flex items-center gap-2 mb-4 pl-1">
                    <AreaChart className="w-3 h-3 text-brand-primary" />
                    企業獲利與估值
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-lg">
                    <RangeInput label="本益比 (P/E Ratio)" minKey="pe_min" maxKey="pe_max" filters={filters} onChange={onChange} />
                    <RangeInput label="現金殖利率 (%)" minKey="yield_min" maxKey="yield_max" filters={filters} onChange={onChange} />
                    <RangeInput label="股價淨值比 (P/B)" minKey="pb_min" maxKey="pb_max" filters={filters} onChange={onChange} />
                </div>
            </div>
        </div>
    )
}
