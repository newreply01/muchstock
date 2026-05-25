import React from 'react';
import StockSearchAutocomplete from '../../forms/StockSearchAutocomplete';

export default function DashboardHeader({ stock, realtime }) {
    const price = realtime?.price || parseFloat(stock?.close_price) || 0;
    const change = realtime?.change || parseFloat(stock?.change_amount) || 0;
    const changePct = realtime?.changePercent || parseFloat(stock?.change_percent) || 0;
    const volume = realtime?.volume || parseInt(stock?.volume) || 0;
    const isUp = Number(changePct) > 0;
    const isDown = Number(changePct) < 0;
    const colorClass = isUp ? 'sd-price-up' : isDown ? 'sd-price-down' : 'sd-price-flat';

    return (
        <div className="sd-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="sd-stock-name">
                    {stock?.name}
                    <span className="sd-stock-code">{stock?.symbol}</span>
                </div>
                <span className={`sd-price-big ${colorClass}`}>
                    {Number(price).toFixed(2)}
                </span>
                <span className={`sd-change-badge ${isUp ? 'up' : isDown ? 'down' : ''}`}>
                    {isUp ? '▲' : isDown ? '▼' : ''} {Math.abs(Number(change)).toFixed(2)} ({Math.abs(Number(changePct)).toFixed(2)}%)
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>成交量</span>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>
                        {Number(volume) >= 10000 ? (Number(volume) / 10000).toFixed(1) + '萬' : Number(volume).toLocaleString()} 張
                    </div>
                </div>
                <div className="sd-bidask" style={{ marginLeft: 8 }}>
                    <div className="sd-bidask-cell buy" style={{ padding: '4px 10px' }}>
                        <span className="sd-bidask-label">買進</span>
                        {realtime?.bid ? Number(realtime.bid).toFixed(2) : Number(price).toFixed(2)}
                    </div>
                    <div className="sd-bidask-cell sell" style={{ padding: '4px 10px' }}>
                        <span className="sd-bidask-label">賣出</span>
                        {realtime?.ask ? Number(realtime.ask).toFixed(2) : (Number(price) + 0.5).toFixed(2)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid #1e293b' }}>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 2 }}>均價</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{Number(realtime?.avg_price || price).toFixed(2)}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 2 }}>內盤</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{Number(realtime?.inside || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 2 }}>外盤</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{Number(realtime?.outside || 0).toLocaleString()}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid #1e293b' }}>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 2 }}>開盤</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{Number(realtime?.open || stock?.open_price || price).toFixed(2)}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 2 }}>最高</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{Number(realtime?.high || stock?.high_price || price).toFixed(2)}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 2 }}>最低</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{Number(realtime?.low || stock?.low_price || price).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div style={{ width: '280px', marginLeft: 'auto', zIndex: 50 }}>
                <StockSearchAutocomplete onSelectStock={(s) => window.dispatchEvent(new CustomEvent('muchstock-select', { detail: s }))} />
            </div>
        </div>
    );
}
