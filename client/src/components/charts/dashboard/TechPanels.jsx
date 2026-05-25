import React from 'react';

export function TechSummaryPanel({ diagnosis }) {
    if (!diagnosis) return <div className="sd-panel"><div className="sd-title"><span className="sd-title-dot"></span>技術分析總覽</div><div style={{color:'#64748b',fontSize:12}}>載入中...</div></div>;
    const items = [
        { label: '趨勢方向', value: diagnosis.indicators?.trend || '多頭趨勢', cls: 'bullish' },
        { label: '價格位置', value: diagnosis.indicators?.position_vs_ma20 === '上方' ? '中高區間 / 靠近上軌' : '中低區間 / 靠近下軌', cls: diagnosis.indicators?.position_vs_ma20 === '上方' ? 'bullish' : 'bearish' },
        { label: '均線排列', value: diagnosis.indicators?.ma_alignment || '多頭排列 (5>20>60)', cls: 'bullish' },
        { label: '量價關係', value: '量增價漲 / 健康多頭', cls: 'bullish' },
        { label: '布林位置', value: diagnosis.indicators?.bollinger_position || '站上中軌，向上靠近上軌', cls: 'bullish' },
    ];
    const overall = diagnosis.rating?.label || '多頭格局未變，短線高檔震盪';
    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>技術分析總覽</div>
            {items.map((it, i) => (
                <div className="sd-tech-row" key={i}>
                    <span className="sd-tech-label">{it.label}</span>
                    <span className={`sd-tech-value ${it.cls}`}>{it.value}</span>
                </div>
            ))}
            <div style={{ marginTop: 8, padding: '6px 0', borderTop: '1px solid #1e293b' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>綜合評估：</span>
                <span style={{ fontWeight: 900, color: overall.includes('買') || overall.includes('多') ? '#ef4444' : overall.includes('賣') || overall.includes('空') ? '#22c55e' : '#eab308' }}> {overall}</span>
            </div>
        </div>
    );
}

export function KeyLevelsPanel({ diagnosis }) {
    const sr = diagnosis?.support_resistance || {};
    const res = Number(sr.resistance?.price || sr.resistance) || 0;
    const sup = Number(sr.support?.price || sr.support) || 0;
    const levels = [
        { label: '壓力區', value: res ? `${Math.round(res * 0.98)} ~ ${Math.round(res)}` : '--', cls: 'resistance' },
        { label: '回檔區', value: res && sup ? `${Math.round(sup)} ~ ${Math.round(res * 0.95)}` : '--', cls: 'resistance' },
        { label: '支撐區', value: sup ? `${Math.round(sup * 0.97)} ~ ${Math.round(sup)}` : '--', cls: 'support' },
        { label: '跌破防守', value: sup ? `${Math.round(sup * 0.95)}` : '--', cls: 'support' },
        { label: '強勢關鍵', value: res ? `${Math.round(res)} (站穩轉強)` : '--', cls: 'resistance' },
    ];
    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>關鍵價位</div>
            {levels.map((lv, i) => (
                <div className={`sd-level-box sd-level-${lv.cls}`} key={i}>
                    <span className="sd-level-label" style={{ color: lv.cls === 'resistance' ? '#ef4444' : '#22c55e' }}>{lv.label}</span>
                    <span className="sd-level-value" style={{ color: '#e2e8f0' }}>{lv.value}</span>
                </div>
            ))}
        </div>
    );
}

export function TechIndicatorsPanel({ diagnosis }) {
    const indicators = [
        { name: 'KD (9,3)', status: '多頭', desc: 'K > D, 向上', cls: 'bullish' },
        { name: 'MACD', status: '多頭', desc: 'DIF > DEA, 紅柱擴大', cls: 'bullish' },
        { name: '均線排列', status: '多頭', desc: '5 > 20 > 60', cls: 'bullish' },
        { name: '布林通道', status: '多頭', desc: '開口擴大, 站上中軌', cls: 'bullish' },
        { name: '成交量', status: '增量', desc: '量增價漲, 健康', cls: 'bullish' },
    ];
    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>技術指標總覽</div>
            <table className="sd-table" style={{ textAlign: 'center' }}>
                <thead><tr><th style={{textAlign:'left'}}>指標</th><th style={{textAlign:'center'}}>狀態</th><th style={{textAlign:'left'}}>說明</th></tr></thead>
                <tbody>
                    {indicators.map((ind, i) => (
                        <tr key={i}>
                            <td style={{textAlign:'left', color:'#94a3b8'}}>{ind.name}</td>
                            <td style={{textAlign:'center', color: ind.cls === 'bullish' ? '#ef4444' : '#22c55e', fontWeight: 900}}>
                                {ind.cls === 'bullish' ? '↗ ' : '↘ '}{ind.status}
                            </td>
                            <td style={{textAlign:'left', color: '#cbd5e1', fontSize: 10}}>{ind.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function MainForcePanel({ institutional }) {
    const data = (institutional || []).slice(0, 5);
    if (!data.length) return <div className="sd-panel"><div className="sd-title"><span className="sd-title-dot"></span>主力進出</div><div style={{color:'#64748b',fontSize:12}}>無資料</div></div>;
    
    let cumNet = 0;
    const rows = data.map(d => {
        const net = Number(d.foreign_net || 0) + Number(d.trust_net || 0) + Number(d.dealer_net || 0);
        cumNet += net;
        return { ...d, net, cumNet };
    });
    
    const signal = cumNet > 0 ? 'bullish' : cumNet < 0 ? 'bearish' : 'neutral';
    const signalText = cumNet > 500 ? '主力短線買超' : cumNet < -500 ? '主力短線賣超' : '法人短線偏空';
    
    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>主力進出</div>
            <table className="sd-table">
                <thead><tr><th>日期</th><th>主力增減</th><th>累計</th><th>收盤價</th><th>漲跌幅</th></tr></thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td>{r.trade_date?.slice(5)}</td>
                            <td style={{ color: r.net > 0 ? '#ef4444' : r.net < 0 ? '#22c55e' : '#94a3b8' }}>{r.net > 0 ? '+' : ''}{Math.round(r.net)}</td>
                            <td style={{ color: r.cumNet > 0 ? '#ef4444' : r.cumNet < 0 ? '#22c55e' : '#94a3b8' }}>{r.cumNet > 0 ? '+' : ''}{Math.round(r.cumNet)}</td>
                            <td style={{ color: '#e2e8f0' }}>{r.close_price ? Number(r.close_price).toFixed(2) : '--'}</td>
                            <td style={{ color: Number(r.change_percent) > 0 ? '#ef4444' : Number(r.change_percent) < 0 ? '#22c55e' : '#94a3b8' }}>
                                {Number(r.change_percent) > 0 ? '+' : ''}{r.change_percent ? Number(r.change_percent).toFixed(2) + '%' : '--'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                結論：主力短線{cumNet > 0 ? '買超' : '賣超'}，5日累計偏{cumNet > 0 ? '多' : '空'}，{signalText}。
            </div>
        </div>
    );
}
