import RangeInput from './RangeInput';
import { Landmark } from 'lucide-react';

export default function InstitutionalFilters({ filters, onChange }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both">
            <div className="space-y-0 relative">
                <div className="absolute -left-4 top-1 w-1 h-4 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(238,49,36,0.5)]"></div>
                <h3 className="font-extrabold text-brand-dark text-xs uppercase tracking-widest flex items-center gap-2 mb-4 pl-1">
                    <Landmark className="w-3 h-3 text-brand-primary" />
                    三大法人資金動向
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-lg space-y-2">
                    <RangeInput label="外資買賣超 (張)" minKey="foreign_net_min" maxKey="foreign_net_max" filters={filters} onChange={onChange} />
                    <RangeInput label="投信買賣超 (張)" minKey="trust_net_min" maxKey="trust_net_max" filters={filters} onChange={onChange} />
                    <RangeInput label="自營商買賣超 (張)" minKey="dealer_net_min" maxKey="dealer_net_max" filters={filters} onChange={onChange} />
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                        <RangeInput label="法人合計總額 (張)" minKey="total_net_min" maxKey="total_net_max" filters={filters} onChange={onChange} />
                    </div>
                </div>
            </div>
        </div>
    )
}
