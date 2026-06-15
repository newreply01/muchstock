import RangeInput from './RangeInput';
import { Target, BarChart3 } from 'lucide-react';

export default function TechnicalFilters({ filters, onChange }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both">
            <div className="space-y-0 relative">
                <div className="absolute -left-4 top-1 w-1 h-4 bg-brand-primary rounded-r-full shadow-[0_0_8px_rgba(238,49,36,0.5)]"></div>
                <h3 className="font-extrabold text-brand-dark text-xs uppercase tracking-widest flex items-center gap-2 mb-4 pl-1">
                    <Target className="w-3 h-3 text-brand-primary" />
                    股價與量能控制
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-lg">
                    <RangeInput label="收盤價階段 (元)" minKey="price_min" maxKey="price_max" filters={filters} onChange={onChange} />
                    <RangeInput label="當日漲跌幅 (%)" minKey="change_min" maxKey="change_max" filters={filters} onChange={onChange} />
                    <RangeInput label="成交張數 (1,000股)" minKey="volume_min" maxKey="volume_max" filters={filters} onChange={onChange} />
                </div>
            </div>

            <div className="space-y-0 relative">
                <div className="absolute -left-4 top-1 w-1 h-4 bg-purple-500 rounded-r-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>
                <h3 className="font-extrabold text-brand-dark text-xs uppercase tracking-widest flex items-center gap-2 mb-4 pl-1">
                    <BarChart3 className="w-3 h-3 text-purple-500" />
                    技術指標過濾 (RSI / MACD / MA)
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-lg">
                    <RangeInput label="RSI (14日)" minKey="rsi_min" maxKey="rsi_max" filters={filters} onChange={onChange} />
                    <RangeInput label="MACD 柱狀體 (OSC)" minKey="macd_hist_min" maxKey="macd_hist_max" filters={filters} onChange={onChange} />
                    <RangeInput label="MA20 均線位置" minKey="ma20_min" maxKey="ma20_max" filters={filters} onChange={onChange} />
                </div>
            </div>

            <div className="space-y-0 relative">
                <div className="absolute -left-4 top-1 w-1 h-4 bg-amber-500 rounded-r-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                <h3 className="font-extrabold text-brand-dark text-xs uppercase tracking-widest flex items-center gap-2 mb-4 pl-1">
                    <BarChart3 className="w-3 h-3 text-amber-500" />
                    進階動能與通道 (DMI / BB / WPR)
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-100">
                    <RangeInput label="ADX 趨勢強度 (14日)" minKey="adx_min" maxKey="adx_max" filters={filters} onChange={onChange} />
                    <RangeInput label="布林通道寬度 (%)" minKey="bb_width_min" maxKey="bb_width_max" filters={filters} onChange={onChange} />
                    <RangeInput label="威廉指標 (WPR 14日)" minKey="wpr_min" maxKey="wpr_max" filters={filters} onChange={onChange} />
                </div>
            </div>
        </div>
    )
}
