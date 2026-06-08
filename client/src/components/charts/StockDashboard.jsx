import React, { useState, useEffect } from 'react';
import './StockDashboard.css';
import DashboardHeader from './dashboard/DashboardHeader';
import { 
  AIIntentPanel, OvernightRiskPanel, SpeedStockRadarPanel, TomorrowScenarioPanel, 
  EnergyBarPanel, MainForceCostChart, VolumeProfilePanel, HealthGaugePanel, 
  AlertLightsPanel, NeuralPredictionChart, MarketSentimentPanel, AISummaryPanel 
} from './dashboard/ECFAIPanels';
import { getHistory, getQuickDiagnosis, getInstitutionalData, getAIReport, getRealtimeData, API_BASE } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

export default function StockDashboard({ stock, realtimeTick, connectionStatus }) {
    const [historyData, setHistoryData] = useState([]);
    const [diagnosis, setDiagnosis] = useState(null);
    const [institutional, setInstitutional] = useState([]);
    const [aiReport, setAiReport] = useState(null);
    const [realtime, setRealtime] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        if (!stock?.symbol) return;
        setLoading(true);

        Promise.all([
            getHistory(stock.symbol, 120, '日K').catch(() => []),
            getQuickDiagnosis(stock.symbol).catch(() => null),
            getInstitutionalData(stock.symbol, 10).catch(() => []),
            getAIReport(stock.symbol).catch(() => null),
            getRealtimeData(stock.symbol).catch(() => null),
            fetch(`${API_BASE}/stock/${stock.symbol}/ai-prediction`).then(r => r.json()).catch(() => null),
        ]).then(([hist, diag, inst, ai, rt, pred]) => {
            setHistoryData(Array.isArray(hist) ? hist : (hist?.data || []));
            if (diag && diag.data) {
                setDiagnosis(diag.data);
            } else if (diag && diag.rating) {
                setDiagnosis(diag);
            } else {
                setDiagnosis(null);
            }
            setInstitutional(Array.isArray(inst) ? inst : (inst?.data || []));
            setAiReport(ai?.data || ai);
            setRealtime(rt?.data || rt);
            setPrediction(pred?.data || pred);
            setLoading(false);
        }).catch(err => {
            console.error("Dashboard fetch error:", err);
            setLoading(false);
        });
    }, [stock?.symbol]);

    // 當 SSE 收到新 Tick 時，更新 realtime state
    useEffect(() => {
        if (realtimeTick) {
            setRealtime(prev => ({
                ...prev,
                ...realtimeTick
            }));
        }
    }, [realtimeTick]);

    if (!stock) return null;

    if (loading) {
        return (
            <div className={`stock-dashboard ${theme}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-subtext)', letterSpacing: 2, textTransform: 'uppercase' }}>載入全景分析...</div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className={`stock-dashboard ${theme}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: theme === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.4)', borderBottom: '1px solid var(--border-panel)' }}>
                <div style={{ flex: 1 }}>
                    <DashboardHeader stock={stock} realtime={realtime} connectionStatus={connectionStatus} />
                </div>
            </div>

            {/* 12宮格 CSS Grid 佈局 */}
            <div className="sd-layout-12grid">
                {(() => {
                    const panelProps = { historyData, diagnosis, institutional, aiReport, realtime, prediction, theme };
                    return (
                        <>
                            <AIIntentPanel {...panelProps} />
                            <OvernightRiskPanel {...panelProps} />
                            <SpeedStockRadarPanel {...panelProps} />
                            <TomorrowScenarioPanel {...panelProps} />
                            
                            <EnergyBarPanel {...panelProps} />
                            <MainForceCostChart {...panelProps} />
                            <VolumeProfilePanel {...panelProps} />
                            <HealthGaugePanel {...panelProps} />
                            
                            <AlertLightsPanel {...panelProps} />
                            <NeuralPredictionChart {...panelProps} />
                            <MarketSentimentPanel {...panelProps} />
                            <AISummaryPanel {...panelProps} />
                        </>
                    );
                })()}
            </div>

            <div style={{ 
                textAlign: 'center', 
                fontSize: '10px', 
                color: 'var(--color-subtext)', 
                padding: '12px', 
                borderTop: '1px solid var(--border-panel)', 
                marginTop: '12px' 
            }}>
                本圖為 AI 技術分析整理，僅供參考，不構成投資建議，投資有風險，請審慎評估並自負風險。 &nbsp;|&nbsp; ECF-AI SYSTEM v2.5.19
            </div>
        </div>
    );
}
