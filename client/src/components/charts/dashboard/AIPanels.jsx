import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function WinRateDonut({ diagnosis }) {
    const score = diagnosis?.rating?.score ? Math.abs(diagnosis.rating.score * 100) : 50;
    const winRate = Math.round(Math.min(score, 99));
    const data = [{ value: winRate }, { value: 100 - winRate }];
    const color = winRate >= 60 ? '#ef4444' : winRate >= 40 ? '#eab308' : '#22c55e';
    const label = winRate >= 70 ? '勝率偏高' : winRate >= 50 ? '勝率中等' : '勝率偏低';

    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>短線勝率 (AI)</div>
            <div className="sd-ai-donut">
                <div style={{ width: 120, height: 120, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={52} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                                <Cell fill={color} />
                                <Cell fill="#1e293b" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <div className="sd-ai-score" style={{ color }}>{winRate}%</div>
                    </div>
                </div>
                <div className="sd-ai-label">綜合勝率</div>
                <div style={{ fontSize: 11, color, fontWeight: 700 }}>{label}</div>
            </div>
        </div>
    );
}

export function PredictionDonut({ prediction }) {
    const up = prediction?.up || 45;
    const down = prediction?.down || 30;
    const flat = prediction?.flat || 25;
    const data = [
        { name: '上漲', value: up, color: '#ef4444' },
        { name: '下跌', value: down, color: '#22c55e' },
        { name: '震盪', value: flat, color: '#eab308' },
    ];
    const conclusion = up > down && up > flat ? '明日震盪偏多' : down > up && down > flat ? '明日偏空' : '明日區間震盪';

    return (
        <div className="sd-panel">
            <div className="sd-title"><span className="sd-title-dot"></span>明日漲跌機率預測 (AI)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 90, height: 90 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="sd-prob-row" style={{ flexDirection: 'column', gap: 4 }}>
                    {data.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }}></span>
                            <span className="sd-prob-label" style={{ minWidth: 36 }}>{d.name}機率</span>
                            <span className="sd-prob-value" style={{ fontSize: 16, color: d.color }}>{d.value}%</span>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                預測結論：<span style={{ color: '#e2e8f0', fontWeight: 800 }}>{conclusion}</span>
            </div>
        </div>
    );
}
