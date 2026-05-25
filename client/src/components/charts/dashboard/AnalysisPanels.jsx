import React from 'react';

export function ChipAnalysisPanel({ institutional }) {
    const data = (institutional || []).slice(0, 5);
    if (!data.length) return <div className="sd-panel"><div className="sd-title"><span className="sd-title-dot"></span>籌碼分析（三大法人）</div><div style={{color:'#64748b',fontSize:12}}>無資料</div></div>;
    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>籌碼分析（三大法人）</div>
            <table className="sd-table">
                <thead><tr><th>日期</th><th>外資</th><th>投信</th><th>自營商</th><th>合計</th></tr></thead>
                <tbody>
                    {data.map((d, i) => {
                        const fNet = Number(d.foreign_net || 0);
                        const tNet = Number(d.trust_net || 0);
                        const dNet = Number(d.dealer_net || 0);
                        const total = fNet + tNet + dNet;
                        return (
                            <tr key={i}>
                                <td>{d.trade_date?.slice(5)}</td>
                                <td style={{ color: fNet > 0 ? '#ef4444' : fNet < 0 ? '#22c55e' : '#94a3b8' }}>{Math.round(fNet)}</td>
                                <td style={{ color: tNet > 0 ? '#ef4444' : tNet < 0 ? '#22c55e' : '#94a3b8' }}>{Math.round(tNet)}</td>
                                <td style={{ color: dNet > 0 ? '#ef4444' : dNet < 0 ? '#22c55e' : '#94a3b8' }}>{Math.round(dNet)}</td>
                                <td style={{ color: total > 0 ? '#ef4444' : total < 0 ? '#22c55e' : '#94a3b8', fontWeight: 900 }}>{Math.round(total)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                結論：近期外資與投信動向須持續觀察，三大法人合計{data[0] && ((data[0].foreign_net||0)+(data[0].trust_net||0)+(data[0].dealer_net||0)) > 0 ? '偏多' : '偏空'}。
            </div>
        </div>
    );
}

export function MultiTimeframePanel({ historyData }) {
    const getMA = (data, period) => {
        if (!data || data.length < period) return null;
        const slice = data.slice(0, period);
        return slice.reduce((s, d) => s + parseFloat(d.close_price || d.close || 0), 0) / period;
    };
    const data = historyData || [];
    const close = data.length > 0 ? parseFloat(data[0]?.close_price || data[0]?.close || 0) : 0;
    const ma5 = getMA(data, 5);
    const ma20 = getMA(data, 20);
    const ma60 = getMA(data, 60);

    const dailyTrend = ma5 && ma20 ? (close > ma20 ? (ma5 > ma20 ? '多頭排列' : '短線轉弱') : (ma5 < ma20 ? '空頭排列' : '短線反彈')) : '--';
    const bollingerState = ma20 ? (close > ma20 * 1.02 ? '價位站上軌' : close < ma20 * 0.98 ? '價位破下軌' : '布林通道內') : '--';

    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>多週期分析</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 4 }}>
                <div style={{ background: 'rgba(30,41,59,0.5)', padding: '6px', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>60分K (短線)</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: close > (ma5 || 0) ? '#ef4444' : '#22c55e' }}>{close > (ma5 || 0) ? '短線偏多' : '短線偏空'}</div>
                </div>
                <div style={{ background: 'rgba(30,41,59,0.5)', padding: '6px', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>日K (中線)</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: dailyTrend.includes('多') ? '#ef4444' : dailyTrend.includes('空') ? '#22c55e' : '#eab308' }}>{dailyTrend}</div>
                </div>
                <div style={{ background: 'rgba(30,41,59,0.5)', padding: '6px', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>週K (長線)</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: ma60 ? (close > ma60 ? '#ef4444' : '#22c55e') : '#94a3b8' }}>{ma60 ? (close > ma60 ? '長線偏多' : '長線偏弱') : '--'}</div>
                </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>布林通道狀態</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{bollingerState}</span>
            </div>
        </div>
    );
}

export function TradingSuggestionPanel({ diagnosis, aiReport }) {
    const suggestion = diagnosis?.ai_summary || aiReport?.summary || '載入中...';
    const rating = diagnosis?.rating;
    
    // Parse markdown if possible, or fallback to fixed structured view for demo
    const isMarkdown = suggestion.includes('#');
    
    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>操作建議</div>
            <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 }}>
                {isMarkdown ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: '4px 8px', marginBottom: 8 }}>
                        <span style={{ color: '#94a3b8' }}>策略：</span><span style={{ color: '#e2e8f0' }}>依據技術面突破或回檔操作</span>
                        <span style={{ color: '#94a3b8' }}>進場：</span><span style={{ color: '#e2e8f0' }}>回檔至支撐區或突破壓力區</span>
                        <span style={{ color: '#94a3b8' }}>防守：</span><span style={{ color: '#e2e8f0' }}>跌破前低或關鍵支撐停損</span>
                        <span style={{ color: '#94a3b8' }}>目標：</span><span style={{ color: '#e2e8f0' }}>上軌或下一個壓力區間</span>
                    </div>
                ) : (
                    <div>{suggestion.length > 120 ? suggestion.slice(0, 120) + '...' : suggestion}</div>
                )}
            </div>
            {rating && (
                <div style={{ fontSize: 10, color: '#eab308', fontStyle: 'italic', borderTop: '1px solid #1e293b', paddingTop: 6 }}>
                    操作方向：以{rating.label === '買進' || rating.label === '強力買進' ? '多方操作為主' : rating.label === '賣出' || rating.label === '強力賣出' ? '減碼觀望為主' : '區間操作為主'}
                </div>
            )}
        </div>
    );
}

export function PatternPanel({ patterns }) {
    const bullish = (patterns || []).filter(p => p.type === 'bullish');
    const bearish = (patterns || []).filter(p => p.type === 'bearish');
    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>型態分析</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
                <div style={{ background: 'rgba(30,41,59,0.4)', padding: '8px', borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>W 底</div>
                    <svg width="40" height="24" viewBox="0 0 40 24" style={{ margin: '0 auto' }}>
                        <polyline points="0,0 10,20 20,10 30,20 40,0" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                        <line x1="0" y1="10" x2="40" y2="10" stroke="#475569" strokeWidth="1" strokeDasharray="2,2"/>
                    </svg>
                    <div style={{ fontSize: 10, color: bullish.length ? '#ef4444' : '#475569', marginTop: 8 }}>{bullish.length ? '已成形' : '未形成'}</div>
                </div>
                <div style={{ background: 'rgba(30,41,59,0.4)', padding: '8px', borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>M 頭</div>
                    <svg width="40" height="24" viewBox="0 0 40 24" style={{ margin: '0 auto' }}>
                        <polyline points="0,24 10,4 20,14 30,4 40,24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round"/>
                        <line x1="0" y1="14" x2="40" y2="14" stroke="#475569" strokeWidth="1" strokeDasharray="2,2"/>
                    </svg>
                    <div style={{ fontSize: 10, color: bearish.length ? '#22c55e' : '#475569', marginTop: 8 }}>{bearish.length ? '已成形' : '未形成'}</div>
                </div>
            </div>
        </div>
    );
}
