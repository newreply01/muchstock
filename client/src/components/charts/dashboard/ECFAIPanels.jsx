import React from 'react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer,
  AreaChart, Area, Tooltip, LineChart, Line
} from 'recharts';

// ─── 工具函式 ───────────────────────────────────────────────────
const safeNum = (val, def = 0) => {
  if (val === null || val === undefined) return def;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? def : n;
};

const formatVol = (v) => {
  const n = safeNum(v);
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(1) + '億';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(0) + '萬';
  return n.toLocaleString();
};

// ─── 1. AI 主力意圖分析圖 ──────────────────────────────────────────
export function AIIntentPanel({ prediction, theme }) {
  const isDark = theme === 'dark';
  
  const status = prediction?.main_force?.status || '-';
  const isBull = status === '多' || status === '偏多';
  const isBear = status === '空' || status === '偏空';
  
  const upProb = safeNum(prediction?.up, 33);
  const downProb = safeNum(prediction?.down, 33);
  const rsi = safeNum(prediction?.factors?.rsi, 50);
  const momentum = safeNum(prediction?.factors?.momentum_5d, 0);
  
  const intents = [
    { name: '主力吸籌', val: Math.min(100, Math.max(0, upProb * 1.5)), desc: upProb > 50 ? '高' : upProb > 35 ? '中' : '低', color: upProb > 50 ? 'var(--color-neon-red)' : 'var(--color-neon-yellow)' },
    { name: '主力出貨', val: Math.min(100, Math.max(0, downProb * 1.5)), desc: downProb > 50 ? '高' : downProb > 35 ? '中' : '低', color: downProb > 50 ? 'var(--color-neon-red)' : 'var(--color-neon-yellow)' },
    { name: '軋空行情', val: isBull && rsi > 60 ? 65 : 15, desc: isBull && rsi > 60 ? '中' : '低', color: 'var(--color-neon-red)' },
    { name: '假突破', val: Math.abs(momentum) < 0.5 && rsi > 60 ? 55 : 20, desc: Math.abs(momentum) < 0.5 && rsi > 60 ? '中' : '低', color: 'var(--color-neon-yellow)' },
    { name: '假多風險', val: isBear ? Math.min(100, downProb * 2) : 15, desc: isBear && downProb > 40 ? '高' : '低', color: 'var(--color-neon-red)' },
    { name: '主力洗盤', val: Math.abs(upProb - downProb) < 10 ? 60 : 25, desc: Math.abs(upProb - downProb) < 10 ? '中' : '低', color: 'var(--color-neon-green)' }
  ];

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />1 &nbsp; AI 主力意圖分析圖</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
        {intents.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ width: '70px', fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</span>
            <div style={{ flex: 1, height: '8px', background: isDark ? '#1e293b' : '#cbd5e1', borderRadius: '4px', margin: '0 8px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ 
                width: `${item.val}%`, height: '100%', background: item.color, borderRadius: '4px',
                boxShadow: isDark ? `0 0 6px ${item.color}` : 'none', transition: 'width 1s ease-in-out'
              }} />
            </div>
            <span style={{ width: '20px', textAlign: 'right', fontWeight: 800, color: item.color }}>{item.desc}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '8px', padding: '6px', background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', fontSize: '10px' }}>
        <div style={{ color: 'var(--color-neon-red)', fontWeight: 800, marginBottom: '2px' }}>AI 主力結論</div>
        <div style={{ color: 'var(--color-text)', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
          {(prediction?.main_force?.reason || '資料分析中...').replace(/\\n/g, '\n')}
        </div>
      </div>
    </div>
  );
}

// ─── 2. 隔日沖風險分析圖 ──────────────────────────────────────────
export function OvernightRiskPanel({ realtime, prediction, historyData, theme }) {
  const isDark = theme === 'dark';
  
  const momentum = safeNum(prediction?.factors?.momentum_5d, 0);
  // realtime.volume 是張數(字串)，history volume 是股數(字串)，需統一為張數
  const currentVolLots = safeNum(realtime?.volume, 0);
  const avgVolLots = Array.isArray(historyData) && historyData.length > 0 
    ? historyData.slice(0,5).reduce((a,b) => a + safeNum(b.volume, 0) / 1000, 0) / Math.min(5, historyData.length)
    : currentVolLots;
  
  const volRatio = avgVolLots > 0 ? currentVolLots / avgVolLots : 1;
  const changePerc = safeNum(realtime?.change_percent, 0);
  
  const riskScore = Math.min(100, Math.max(5, 
    30 + 
    (momentum > 1 ? 15 : momentum > 0 ? 5 : 0) + 
    (volRatio > 2 ? 25 : volRatio > 1.5 ? 15 : 0) +
    (changePerc > 5 ? 20 : changePerc > 3 ? 10 : 0)
  ));

  const riskMetrics = [
    { name: '爆量程度', val: Math.min(100, Math.round(volRatio * 30)) },
    { name: '漲幅過大', val: Math.min(100, Math.round(Math.abs(changePerc) * 12)) },
    { name: '動能過熱', val: Math.min(100, Math.max(0, Math.round(50 + momentum * 15))) },
    { name: '開高走低風險', val: Math.round(riskScore * 0.9) },
    { name: '高檔爆量黑K', val: changePerc > 3 && volRatio > 1.5 ? 85 : 20 }
  ];

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />2 &nbsp; 隔日沖風險分析圖</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' }}>
        {riskMetrics.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ width: '100px', fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</span>
            <div style={{ flex: 1, height: '6px', background: isDark ? '#1e293b' : '#cbd5e1', borderRadius: '3px', margin: '0 8px', overflow: 'hidden' }}>
              <div style={{ width: `${item.val}%`, height: '100%', background: item.val > 70 ? 'var(--color-neon-red)' : item.val > 40 ? 'var(--color-neon-yellow)' : 'var(--color-neon-green)', transition: 'width 1s' }} />
            </div>
            <span style={{ fontWeight: 800, color: item.val > 70 ? 'var(--color-neon-red)' : item.val > 40 ? 'var(--color-neon-yellow)' : 'var(--color-neon-green)' }}>{item.val > 70 ? '高' : item.val > 40 ? '中' : '低'}</span>
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px dashed var(--color-subtext)', paddingTop: '6px' }}>
        <div>
          <span style={{ fontSize: '10px', color: 'var(--color-subtext)', display: 'block' }}>隔日沖風險</span>
          <span style={{ fontSize: '24px', fontWeight: 900, color: riskScore > 60 ? 'var(--color-neon-red)' : 'var(--color-neon-green)', textShadow: isDark ? '0 0 10px rgba(255, 77, 77, 0.4)' : 'none' }}>{Math.round(riskScore)}%</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '10px', color: 'var(--color-subtext)', display: 'block' }}>量比</span>
          <span style={{ fontSize: '14px', fontWeight: 900, color: volRatio > 1.5 ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }}>{volRatio.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
}

// ─── 3. 飆股雷達圖 ──────────────────────────────────────────────
export function SpeedStockRadarPanel({ diagnosis, prediction, theme }) {
  const isDark = theme === 'dark';
  
  const momentum = safeNum(prediction?.factors?.momentum_5d, 0);
  const rsi = safeNum(prediction?.factors?.rsi, 50);
  const aiSent = safeNum(prediction?.factors?.ai_sentiment, 50);
  // diagnosis 實際欄位: score (0-100), rating.details.technical (-1~1), rating.details.sentiment (-1~1)
  const diagScore = safeNum(diagnosis?.score, 50);
  const techDetail = safeNum(diagnosis?.rating?.details?.technical, 0);
  const sentDetail = safeNum(diagnosis?.rating?.details?.sentiment, 0);
  const instNet = safeNum(prediction?.factors?.inst_net_5d, 0);
  
  const data = [
    { subject: '趨勢強度', A: Math.min(100, Math.max(0, 50 + momentum * 12)) },
    { subject: '技術面', A: Math.min(100, Math.max(0, diagScore)) },
    { subject: 'RSI動能', A: Math.min(100, rsi) },
    { subject: '法人籌碼', A: Math.min(100, Math.max(0, 50 + (instNet > 0 ? Math.min(50, instNet / 500000) : Math.max(-50, instNet / 500000)))) },
    { subject: '市場情緒', A: Math.min(100, Math.max(0, aiSent)) },
    { subject: '綜合評分', A: Math.min(100, Math.max(0, 50 + techDetail * 30 + sentDetail * 20)) }
  ];
  
  const avgRisk = data.reduce((a, b) => a + b.A, 0) / 6;
  const grade = avgRisk > 80 ? 'S' : avgRisk > 65 ? 'A' : avgRisk > 50 ? 'B' : avgRisk > 35 ? 'C' : 'D';

  return (
    <div className="sd-panel ecf-panel" style={{ position: 'relative' }}>
      <div className="sd-title"><div className="sd-title-dot" />3 &nbsp; 飆股雷達圖</div>
      
      <div style={{ height: '140px', width: '100%', marginTop: '6px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke={isDark ? "rgba(0, 229, 255, 0.15)" : "rgba(2, 132, 199, 0.15)"} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text)', fontSize: 8, fontWeight: 700 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="飆股指標" dataKey="A" stroke="var(--color-neon-red)" fill="var(--color-neon-red)" fillOpacity={0.25} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', borderTop: '1px dashed var(--color-subtext)', paddingTop: '6px' }}>
        <div>
          <span style={{ color: 'var(--color-text)', fontWeight: 800 }}>飆股等級：</span>
          <span style={{ fontSize: '18px', fontWeight: 950, color: 'var(--color-neon-red)', textShadow: isDark ? '0 0 8px rgba(255, 77, 77, 0.6)' : 'none' }}>{grade}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: 'var(--color-text)', fontWeight: 800 }}>綜合值：</span>
          <span style={{ color: 'var(--color-neon-red)', fontWeight: 900 }}>{Math.round(avgRisk)}</span>
          <span style={{ color: 'var(--color-subtext)' }}> / 100</span>
        </div>
      </div>
    </div>
  );
}

// ─── 4. 明日劇本推演圖 ──────────────────────────────────────────
export function TomorrowScenarioPanel({ prediction, realtime, diagnosis, theme }) {
  const isDark = theme === 'dark';
  const price = safeNum(realtime?.price, 100);
  const upProb = safeNum(prediction?.up, 33);
  const flatProb = safeNum(prediction?.flat, 33);
  const downProb = safeNum(prediction?.down, 33);
  const resistance = safeNum(diagnosis?.support_resistance?.resistance, price * 1.05);
  const support = safeNum(diagnosis?.support_resistance?.support, price * 0.95);
  
  const scenarios = [
    {
      id: '劇本1', title: '突破上漲', prob: `${upProb}%`,
      cond: `站穩 ${price.toFixed(0)} 之上，量能擴大`,
      keyP: price.toFixed(0), target: resistance.toFixed(0), stop: (price * 0.97).toFixed(0),
      color: 'var(--color-neon-green)', bg: 'rgba(0, 230, 118, 0.05)', border: 'rgba(0, 230, 118, 0.25)'
    },
    {
      id: '劇本2', title: '震盪整理', prob: `${flatProb}%`,
      cond: `在 ${support.toFixed(0)} ~ ${resistance.toFixed(0)} 區間震盪`,
      keyP: price.toFixed(0), target: resistance.toFixed(0), stop: support.toFixed(0),
      color: 'var(--color-neon-yellow)', bg: 'rgba(255, 214, 0, 0.05)', border: 'rgba(255, 214, 0, 0.25)'
    },
    {
      id: '劇本3', title: '轉弱下跌', prob: `${downProb}%`,
      cond: `跌破 ${support.toFixed(0)}，量能擴大`,
      keyP: support.toFixed(0), target: (support * 0.95).toFixed(0), stop: price.toFixed(0),
      color: 'var(--color-neon-red)', bg: 'rgba(255, 77, 77, 0.05)', border: 'rgba(255, 77, 77, 0.25)'
    }
  ];

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />4 &nbsp; 明日劇本推演圖</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
        {scenarios.map((sc, idx) => (
          <div key={idx} style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '4px', padding: '4px 6px', fontSize: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginBottom: '2px' }}>
              <span style={{ color: sc.color }}>{sc.id} {sc.title}</span>
              <span style={{ color: 'var(--color-text)' }}>(機率 {sc.prob})</span>
            </div>
            <div style={{ color: 'var(--color-subtext)', marginBottom: '3px' }}>條件：{sc.cond}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text)' }}>
              <span>關鍵價: <strong style={{ color: 'var(--color-text)' }}>{sc.keyP}</strong></span>
              <span>目標價: <strong style={{ color: 'var(--color-neon-red)' }}>{sc.target}</strong></span>
              <span>停損價: <strong style={{ color: 'var(--color-neon-green)' }}>{sc.stop}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 5. AI 多空能量條 ──────────────────────────────────────────
export function EnergyBarPanel({ prediction, theme }) {
  const isDark = theme === 'dark';
  const up = safeNum(prediction?.up, 50);
  const down = safeNum(prediction?.down, 50);
  const flat = safeNum(prediction?.flat, 0);
  const rsi = safeNum(prediction?.factors?.rsi, 50);
  const macd = safeNum(prediction?.factors?.macd_hist, 0);
  const instNet = safeNum(prediction?.factors?.inst_net_5d, 0);
  const total = up + down > 0 ? up + down : 100;
  const upPerc = Math.round((up / total) * 100);
  const downPerc = 100 - upPerc;

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />5 &nbsp; AI 多空能量條</div>
      
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
          <span style={{ color: 'var(--color-neon-red)' }}>多方能量</span>
          <span style={{ color: 'var(--color-neon-green)' }}>空方能量</span>
        </div>
        <div style={{ height: '14px', display: 'flex', borderRadius: '7px', overflow: 'hidden', boxShadow: isDark ? '0 0 10px rgba(0, 0, 0, 0.5)' : 'none' }}>
          <div style={{ width: `${upPerc}%`, background: 'linear-gradient(90deg, #ef4444, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '8px', color: '#fff', fontSize: '9px', fontWeight: 900, transition: 'width 1s' }}>{upPerc}%</div>
          <div style={{ width: `${downPerc}%`, background: 'linear-gradient(90deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', color: '#fff', fontSize: '9px', fontWeight: 900, transition: 'width 1s' }}>{downPerc}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px', borderTop: '1px dashed var(--color-subtext)', paddingTop: '8px', fontSize: '9px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: rsi > 50 ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }} />
            <span style={{ color: 'var(--color-text)' }}>RSI {rsi.toFixed(0)}</span>
            <span style={{ color: rsi > 70 ? 'var(--color-neon-red)' : rsi > 50 ? 'var(--color-neon-yellow)' : 'var(--color-neon-green)', fontWeight: 800 }}>{rsi > 70 ? '過熱' : rsi > 50 ? '偏多' : rsi < 30 ? '超賣' : '偏空'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: macd > 0 ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }} />
            <span style={{ color: 'var(--color-text)' }}>MACD {macd.toFixed(1)}</span>
            <span style={{ color: macd > 0 ? 'var(--color-neon-red)' : 'var(--color-neon-green)', fontWeight: 800 }}>{macd > 0 ? '多頭' : '空頭'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: prediction?.factors?.ma_position === '上方' ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }} />
            <span style={{ color: 'var(--color-text)' }}>均線</span>
            <span style={{ color: prediction?.factors?.ma_position === '上方' ? 'var(--color-neon-red)' : 'var(--color-neon-green)', fontWeight: 800 }}>{prediction?.factors?.ma_position || '未知'}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-subtext)' }}>法人:</span>
            <span style={{ color: instNet > 0 ? 'var(--color-neon-red)' : 'var(--color-neon-green)', fontWeight: 800 }}>{instNet > 0 ? '買超' : '賣超'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-subtext)' }}>主力:</span>
            <span style={{ color: 'var(--color-neon-yellow)', fontWeight: 800 }}>{prediction?.main_force?.status_desc || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-subtext)' }}>動能:</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 800 }}>{safeNum(prediction?.factors?.momentum_5d).toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. 主力成本線分析圖 ──────────────────────────────────────────
export function MainForceCostChart({ historyData, theme }) {
  const isDark = theme === 'dark';
  
  const data = [];
  if (Array.isArray(historyData) && historyData.length > 0) {
    const recent = historyData.slice(0, 10).reverse();
    let sumMain = 0;
    let sumRetail = 0;
    recent.forEach((d, i) => {
      const closeP = safeNum(d.close);
      const highP = safeNum(d.high, closeP);
      sumMain += closeP;
      sumRetail += highP * 1.005; // 散戶追高微溢價
      data.push({
        name: (d.time || d.date || '').substring(5) || `D${i+1}`,
        price: closeP,
        main: parseFloat((sumMain / (i + 1)).toFixed(2)),
        retail: parseFloat((sumRetail / (i + 1)).toFixed(2))
      });
    });
  }

  if (data.length === 0) {
    return (
      <div className="sd-panel ecf-panel"><div className="sd-title"><div className="sd-title-dot" />6 &nbsp; 主力成本線分析圖</div>
        <div style={{ textAlign: 'center', color: 'var(--color-subtext)', padding: '20px', fontSize: '11px' }}>載入中...</div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const allVals = data.flatMap(d => [d.price, d.main, d.retail]);
  const minP = Math.floor(Math.min(...allVals) * 0.98);
  const maxP = Math.ceil(Math.max(...allVals) * 1.02);

  return (
    <div className="sd-panel ecf-panel" style={{ overflow: 'visible' }}>
      <div className="sd-title"><div className="sd-title-dot" />6 &nbsp; 主力成本線分析圖</div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
        <span style={{ color: 'var(--color-neon-red)' }}>主力平均成本: {latest.main}</span>
        <span style={{ color: 'var(--color-neon-yellow)' }}>散戶平均成本: {latest.retail}</span>
      </div>

      <div style={{ height: '100px', width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <XAxis dataKey="name" stroke="var(--color-subtext)" fontSize={8} tickLine={false} />
            <YAxis stroke="var(--color-subtext)" fontSize={8} domain={[minP, maxP]} tickLine={false} />
            <Tooltip contentStyle={{ background: isDark ? '#0f172a' : '#fff', border: '1px solid #1e3a8a', fontSize: '9px', color: isDark ? '#fff' : '#000' }} />
            <Line type="monotone" dataKey="price" stroke="var(--color-neon-red)" strokeWidth={2} dot={{ r: 2 }} name="收盤價" />
            <Line type="monotone" dataKey="main" stroke="#f43f5e" strokeDasharray="3 3" name="主力成本" dot={false} />
            <Line type="monotone" dataKey="retail" stroke="#eab308" strokeDasharray="3 3" name="散戶成本" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '9px', borderTop: '1px dashed var(--color-subtext)', paddingTop: '4px' }}>
        <div>
          <span style={{ color: 'var(--color-text)' }}>散戶: <strong style={{ color: latest.price > latest.retail ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }}>
            {latest.price > latest.retail ? '獲利中' : '套牢中'}
          </strong></span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: 'var(--color-text)' }}>主力: <strong style={{ color: latest.price > latest.main ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }}>
            {latest.main > 0 ? ((latest.price - latest.main) / latest.main * 100).toFixed(1) + '%' : '-'}
          </strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── 7. AI 籌碼熱區圖 ────────────────────────────────────────────
export function VolumeProfilePanel({ historyData, theme }) {
  const isDark = theme === 'dark';
  
  let data = [];
  if (Array.isArray(historyData) && historyData.length > 0) {
    const recent = historyData.slice(0, 30);
    const closes = recent.map(d => safeNum(d.close));
    const validCloses = closes.filter(c => c > 0);
    if (validCloses.length > 0) {
      const minP = Math.min(...validCloses);
      const maxP = Math.max(...validCloses);
      const range = maxP - minP;
      if (range > 0) {
        const step = range / 5;
        const bins = Array(5).fill(0).map((_, i) => ({
          min: minP + i * step,
          max: minP + (i + 1) * step,
          vol: 0,
          center: minP + (i + 0.5) * step
        }));
        
        recent.forEach(d => {
          const c = safeNum(d.close);
          const v = safeNum(d.volume);
          if (c > 0 && v > 0) {
            const idx = Math.min(4, Math.floor((c - minP) / step));
            bins[idx].vol += v;
          }
        });

        const maxVol = Math.max(...bins.map(b => b.vol));

        data = bins.map(b => ({
          price: b.center.toFixed(0),
          vol: b.vol,
          color: b.vol === maxVol ? '#ef4444' : (b.vol > maxVol * 0.5 ? '#f59e0b' : '#3b82f6')
        })).reverse();
      }
    }
  }

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />7 &nbsp; AI 籌碼熱區圖 (Volume Profile)</div>
      
      <div style={{ height: '140px', width: '100%', marginTop: '6px' }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="price" type="category" stroke="var(--color-text)" fontSize={8} width={50} tickLine={false} />
              <Tooltip contentStyle={{ background: isDark ? '#0f172a' : '#fff', border: '1px solid #1e3a8a', fontSize: '9px', color: isDark ? '#fff' : '#000' }} formatter={(v) => formatVol(v)} />
              <Bar dataKey="vol" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-subtext)', paddingTop: '40px', fontSize: '11px' }}>資料不足</div>
        )}
      </div>
    </div>
  );
}

// ─── 8. 個股健康度儀表板 ──────────────────────────────────────────
export function HealthGaugePanel({ prediction, diagnosis, theme }) {
  const isDark = theme === 'dark';
  
  const up = safeNum(prediction?.up, 50);
  const rsi = safeNum(prediction?.factors?.rsi, 50);
  const aiSent = safeNum(prediction?.factors?.ai_sentiment, 50);
  const diagScore = safeNum(diagnosis?.score, 50);
  const mom = safeNum(prediction?.factors?.momentum_5d, 0);

  const gauges = [
    { name: '趨勢', val: Math.min(100, Math.max(0, 50 + mom * 10)), color: mom > 0 ? 'var(--color-neon-red)' : 'var(--color-neon-green)' },
    { name: '籌碼', val: aiSent, color: aiSent > 60 ? 'var(--color-neon-red)' : aiSent > 40 ? 'var(--color-neon-yellow)' : 'var(--color-neon-green)' },
    { name: 'RSI', val: rsi, color: rsi > 70 ? 'var(--color-neon-red)' : rsi > 30 ? 'var(--color-neon-yellow)' : 'var(--color-neon-green)' },
    { name: '健診', val: diagScore, color: diagScore > 60 ? 'var(--color-neon-red)' : diagScore > 40 ? 'var(--color-neon-yellow)' : 'var(--color-neon-green)' }
  ];

  const totalHealth = gauges.reduce((a, b) => a + b.val, 0) / gauges.length;

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />8 &nbsp; 個股健康度儀表板</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '10px' }}>
        {gauges.map((g, idx) => {
          const radius = 16;
          const strokeWidth = 3;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (g.val / 100) * circumference;
          
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ position: 'relative', width: '38px', height: '38px' }}>
                <svg width="38" height="38" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="19" cy="19" r={radius} fill="transparent" stroke={isDark ? "#1e293b" : "#e2e8f0"} strokeWidth={strokeWidth} />
                  <circle cx="19" cy="19" r={radius} fill="transparent" stroke={g.color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                    style={{ filter: isDark ? `drop-shadow(0 0 2px ${g.color})` : 'none', transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '9px', fontWeight: 900, color: 'var(--color-text)' }}>{Math.round(g.val)}</div>
              </div>
              <span style={{ fontSize: '7.5px', color: 'var(--color-subtext)', textAlign: 'center', whiteSpace: 'nowrap' }}>{g.name}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '10px', padding: '4px', background: totalHealth > 65 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: `1px solid ${totalHealth > 65 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`, borderRadius: '4px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: 'var(--color-subtext)' }}>綜合健康評估</div>
        <div style={{ fontSize: '18px', fontWeight: 950, color: totalHealth > 70 ? 'var(--color-neon-red)' : totalHealth > 50 ? 'var(--color-neon-yellow)' : 'var(--color-neon-green)' }}>
          {totalHealth > 75 ? '過熱' : totalHealth > 55 ? '健康' : totalHealth > 40 ? '整理' : '轉弱'}
        </div>
      </div>
    </div>
  );
}

// ─── 9. AI 股預警燈號系統 ────────────────────────────────────────
export function AlertLightsPanel({ prediction, theme }) {
  const isDark = theme === 'dark';
  const status = prediction?.main_force?.status || '-';
  
  // 精確匹配：偏多/偏空 → 黃燈，多 → 紅燈，空 → 綠燈
  let activeLight = 'black';
  if (status === '多') activeLight = 'red';
  else if (status === '偏多' || status === '偏空') activeLight = 'yellow';
  else if (status === '空') activeLight = 'green';

  const lights = [
    { id: 'red', name: '紅燈：主力強力作多', desc: '主力大量買超、多頭排列、向上攻擊', color: '#ff4d4d' },
    { id: 'yellow', name: '黃燈：震盪觀察', desc: '主力買賣方向不明確、高檔震盪', color: '#ffd600' },
    { id: 'green', name: '綠燈：主力調節', desc: '主力賣超、跌破均線、風險升高', color: '#00e676' },
    { id: 'black', name: '黑燈：觀望', desc: '無明顯主力動向', color: '#334155' }
  ];

  const reasonLines = (prediction?.main_force?.reason || '').replace(/\\n/g, '\n').split('\n').filter(Boolean);

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />9 &nbsp; AI 股預警燈號系統</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
        {lights.map((l, idx) => {
          const isActive = l.id === activeLight;
          const glowStyle = isActive && isDark ? {
            backgroundColor: l.color, boxShadow: `0 0 12px ${l.color}, inset 0 0 4px #fff`, border: '1px solid #fff'
          } : isActive ? {
            backgroundColor: l.color, boxShadow: `0 0 6px ${l.color}`, border: '1px solid #fff'
          } : { backgroundColor: isDark ? '#1e293b' : '#cbd5e1', opacity: 0.3 };

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', transition: 'all 0.3s', flexShrink: 0, ...glowStyle }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', fontWeight: isActive ? 900 : 700, color: isActive ? l.color : 'var(--color-text)' }}>{l.name}{isActive ? ` (${status})` : ''}</span>
                <span style={{ fontSize: '8.5px', color: 'var(--color-subtext)' }}>{isActive && reasonLines.length > 0 ? reasonLines[0] : l.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 10. 類神經 AI 預測路徑圖 ─────────────────────────────────────
export function NeuralPredictionChart({ historyData, realtime, prediction, theme }) {
  const isDark = theme === 'dark';
  
  const data = [];
  let lastPrice = safeNum(realtime?.price, 100);
  
  if (Array.isArray(historyData) && historyData.length >= 5) {
    const recent = historyData.slice(0, 5).reverse();
    recent.forEach((d) => {
      const closeP = safeNum(d.close);
      data.push({
        date: (d.time || d.date || '').substring(5) || '',
        price: closeP,
        predMid: closeP,
        predUpper: closeP,
        predLower: closeP
      });
      lastPrice = closeP;
    });
  } else if (lastPrice > 0) {
    data.push({ date: '今日', price: lastPrice, predMid: lastPrice, predUpper: lastPrice, predLower: lastPrice });
  }

  const up = safeNum(prediction?.up, 33);
  const down = safeNum(prediction?.down, 33);
  const netProb = (up - down) / 100;
  
  const points = [
    { label: '未來3日', days: 3 },
    { label: '未來5日', days: 5 },
    { label: '未來10日', days: 10 }
  ];

  points.forEach(p => {
    const drift = lastPrice * netProb * (p.days * 0.005);
    const mid = lastPrice + drift;
    const spread = lastPrice * 0.015 * Math.sqrt(p.days);
    
    data.push({
      date: p.label,
      predMid: parseFloat(mid.toFixed(2)),
      predUpper: parseFloat((mid + spread).toFixed(2)),
      predLower: parseFloat((mid - spread).toFixed(2))
    });
  });

  const allPrices = data.flatMap(d => [d.predLower || d.price, d.predUpper || d.price, d.price].filter(Boolean));
  const minP = Math.floor(Math.min(...allPrices) * 0.98);
  const maxP = Math.ceil(Math.max(...allPrices) * 1.02);

  return (
    <div className="sd-panel ecf-panel">
      <div className="sd-title"><div className="sd-title-dot" />10 &nbsp; 類神經 AI 預測路徑圖</div>
      
      <div style={{ height: '140px', width: '100%', marginTop: '6px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <XAxis dataKey="date" stroke="var(--color-subtext)" fontSize={7} tickLine={false} />
            <YAxis stroke="var(--color-subtext)" fontSize={8} domain={[minP, maxP]} tickLine={false} />
            <Tooltip contentStyle={{ background: isDark ? '#0f172a' : '#fff', border: '1px solid #1e3a8a', fontSize: '9px', color: isDark ? '#fff' : '#000' }} />
            <Area type="monotone" dataKey="predUpper" stroke="none" fill="rgba(99, 102, 241, 0.12)" />
            <Area type="monotone" dataKey="predLower" stroke="none" fill="rgba(99, 102, 241, 0.12)" />
            <Line type="monotone" dataKey="price" stroke="var(--color-neon-red)" strokeWidth={2} dot={{ r: 2 }} name="收盤價" />
            <Line type="monotone" dataKey="predMid" stroke="#818cf8" strokeDasharray="4 3" dot={{ r: 2 }} name="預測中軌" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: '8px', color: 'var(--color-subtext)', textAlign: 'center', marginTop: '2px' }}>
        多空機率: 漲 {up}% / 跌 {down}% / 盤整 {safeNum(prediction?.flat)}%
      </div>
    </div>
  );
}

// ─── 11. 台股情緒指數圖 ──────────────────────────────────────────
export function MarketSentimentPanel({ prediction, theme }) {
  const isDark = theme === 'dark';
  
  const sentimentVal = safeNum(prediction?.factors?.ai_sentiment, 50);
  const angle = 180 - (sentimentVal / 100) * 180;
  const instNet = safeNum(prediction?.factors?.inst_net_5d, 0);
  const momentum = safeNum(prediction?.factors?.momentum_5d, 0);
  
  const rsi = safeNum(prediction?.factors?.rsi, 50);
  const maPos = prediction?.factors?.ma_position || '未知';

  let label = '中性';
  if (sentimentVal > 75) label = '極度貪婪';
  else if (sentimentVal > 60) label = '貪婪';
  else if (sentimentVal < 25) label = '極度恐懼';
  else if (sentimentVal < 40) label = '恐懼';

  let advice = '⚖️ 情緒處於中性平衡區，市場觀望氣氛濃，適合區間來回，高出低進。';
  let adviceColor = 'var(--color-neon-blue)';
  let adviceBg = 'rgba(0, 229, 255, 0.05)';
  let adviceBorder = 'rgba(0, 229, 255, 0.15)';

  if (sentimentVal > 75) {
    advice = '⚠️ 情緒進入極度貪婪區，追高風險偏高，建議分批獲利了結，嚴防拉回。';
    adviceColor = 'var(--color-neon-red)';
    adviceBg = 'rgba(255, 77, 77, 0.05)';
    adviceBorder = 'rgba(255, 77, 77, 0.15)';
  } else if (sentimentVal > 60) {
    advice = '📈 市場情緒偏向樂觀，趨勢多頭佔優，建議可沿 5 日線偏多操作。';
    adviceColor = 'var(--color-neon-red)';
    adviceBg = 'rgba(255, 77, 77, 0.03)';
    adviceBorder = 'rgba(255, 77, 77, 0.1)';
  } else if (sentimentVal < 25) {
    advice = '🔥 情緒進入極度恐懼區，賣壓恐慌宣洩，但長線價值浮現，可分批承接。';
    adviceColor = 'var(--color-neon-green)';
    adviceBg = 'rgba(0, 230, 118, 0.05)';
    adviceBorder = 'rgba(0, 230, 118, 0.15)';
  } else if (sentimentVal < 40) {
    advice = '📉 情緒偏向悲觀，賣壓尚未完全釋放，操作上應保持耐心，靜待落底。';
    adviceColor = 'var(--color-neon-green)';
    adviceBg = 'rgba(0, 230, 118, 0.03)';
    adviceBorder = 'rgba(0, 230, 118, 0.1)';
  }

  return (
    <div className="sd-panel ecf-panel align-start">
      <div className="sd-title"><div className="sd-title-dot" />11 &nbsp; 個股情緒指數圖</div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        <div style={{ position: 'relative', width: '100px', height: '70px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <svg width="100" height="70" viewBox="0 0 100 70">
            <defs>
              <linearGradient id="sentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00e676" />
                <stop offset="50%" stopColor="#ffd600" />
                <stop offset="100%" stopColor="#ff4d4d" />
              </linearGradient>
            </defs>
            <path d="M 10 60 A 40 40 0 0 1 90 60" fill="none" stroke="url(#sentGrad)" strokeWidth="8" strokeLinecap="round" />
            <circle cx="50" cy="60" r="4" fill="var(--color-text)" />
            <line x1="50" y1="60" x2="50" y2="28" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round"
              transform={`rotate(${angle - 90} 50 60)`} style={{ transition: 'transform 1s ease-in-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', bottom: '2px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 950, color: sentimentVal > 50 ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }}>{label}</div>
            <div style={{ fontSize: '10px', color: 'var(--color-text)', fontWeight: 800 }}>{Math.round(sentimentVal)} / 100</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
            <span style={{ color: 'var(--color-subtext)' }}>AI 情緒</span>
            <span style={{ color: sentimentVal > 50 ? 'var(--color-neon-red)' : 'var(--color-neon-green)', fontWeight: 800 }}>{Math.round(sentimentVal)} ({label})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
            <span style={{ color: 'var(--color-subtext)' }}>法人5日</span>
            <span style={{ color: instNet > 0 ? 'var(--color-neon-red)' : 'var(--color-neon-green)', fontWeight: 800 }}>{formatVol(instNet)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
            <span style={{ color: 'var(--color-subtext)' }}>動能</span>
            <span style={{ color: momentum > 0 ? 'var(--color-neon-red)' : 'var(--color-neon-green)', fontWeight: 800 }}>{momentum.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* 輔助情緒因子 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '5px', marginTop: '5px', fontSize: '9px' }}>
        <div>
          <span style={{ color: 'var(--color-subtext)' }}>強弱 RSI:</span>
          <strong style={{ color: rsi > 70 ? 'var(--color-neon-red)' : rsi < 30 ? 'var(--color-neon-green)' : 'var(--color-text)', fontWeight: 800 }}>
            {rsi.toFixed(1)} ({rsi > 70 ? '超買' : rsi < 30 ? '超賣' : '整理'})
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-subtext)' }}>季線位置:</span>
          <strong style={{ color: maPos === '上方' || maPos === '突破' ? 'var(--color-neon-red)' : 'var(--color-neon-green)', fontWeight: 800 }}>
            {maPos}
          </strong>
        </div>
      </div>

      {/* AI 情緒分析點評 */}
      <div style={{ 
        marginTop: '5px', 
        padding: '4px 6px', 
        borderRadius: '4px', 
        background: adviceBg, 
        border: `1px solid ${adviceBorder}`, 
        color: adviceColor, 
        fontSize: '8.5px', 
        lineHeight: '1.3',
        fontWeight: 600,
        width: '100%'
      }}>
        {advice}
      </div>
    </div>
  );
}

// ─── 12. AI 總結與投資建議 ────────────────────────────────────────
export function AISummaryPanel({ aiReport, prediction, diagnosis, theme, realtime }) {
  const isDark = theme === 'dark';
  
  const status = prediction?.main_force?.status || '-';
  const isBull = status === '多' || status === '偏多';
  const isBear = status === '空' || status === '偏空';
  const diagLabel = diagnosis?.rating?.label || '';
  
  const price = safeNum(realtime?.price, 100);
  const resistance = safeNum(diagnosis?.support_resistance?.resistance, price * 1.05);
  const support = safeNum(diagnosis?.support_resistance?.support, price * 0.95);
  const stopLoss = support * 0.97;
  
  let riskLevel = '中';
  if (safeNum(prediction?.down) > 50) riskLevel = '高';
  else if (safeNum(prediction?.up) > 60) riskLevel = '低';

  const reasonText = prediction?.main_force?.reason || '';
  const reasonLines = reasonText.replace(/\\n/g, '\n').split('\n').filter(Boolean);

  return (
    <div className="sd-panel ecf-panel align-start" style={{ 
      border: isBull ? '1px solid rgba(255, 77, 77, 0.4)' : (isBear ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 214, 0, 0.4)'), 
      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
    }}>
      <div className="sd-title">
        <div className="sd-title-dot" style={{ background: isBull ? 'var(--color-neon-red)' : 'var(--color-neon-green)' }} />
        12 &nbsp; AI 總結與投資建議
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>{isBull ? '🚀' : (isBear ? '⚠️' : '📊')}</span>
          <span style={{ fontSize: '11px', fontWeight: 900, color: isBull ? 'var(--color-neon-red)' : 'var(--color-text)' }}>
            {prediction?.main_force?.status_desc || '持續觀察'}{diagLabel ? ` · ${diagLabel}` : ''}
          </span>
        </div>
        
        <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '9px', color: 'var(--color-text)', lineHeight: '1.4' }}>
          {reasonLines.length > 0 ? reasonLines.map((r, i) => <li key={i}>{r}</li>) : (
            <li>{typeof aiReport?.report === 'string' ? aiReport.report.substring(0, 80) + '...' : '無特別建議'}</li>
          )}
        </ul>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '4px', borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '5px', fontSize: '9px' }}>
          <div>
            <span style={{ color: 'var(--color-subtext)' }}>風險等級：</span>
            <strong style={{ color: riskLevel === '高' ? 'var(--color-neon-red)' : riskLevel === '低' ? 'var(--color-neon-green)' : 'var(--color-neon-yellow)', fontWeight: 900 }}>{riskLevel}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-subtext)' }}>建議策略：</span>
            <strong style={{ color: 'var(--color-text)', fontWeight: 800 }}>
              {isBull ? '偏多操作，順勢而為' : (isBear ? '保守操作，嚴設停損' : '區間震盪，高出低進')}
            </strong>
          </div>
        </div>

        {/* 底部新增的 AI 建議防守/壓力價格點位 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '4px', 
          borderTop: '1px dashed rgba(255,255,255,0.15)', 
          paddingTop: '5px', 
          marginTop: '2px', 
          fontSize: '8.5px',
          textAlign: 'center'
        }}>
          <div style={{ background: 'rgba(255, 77, 77, 0.05)', padding: '2px 0', borderRadius: '3px', border: '1px solid rgba(255, 77, 77, 0.1)' }}>
            <div style={{ color: 'var(--color-subtext)', fontSize: '7.5px' }}>強壓力位</div>
            <strong style={{ color: 'var(--color-neon-red)', fontSize: '9.5px', fontWeight: 900 }}>{resistance.toFixed(1)}</strong>
          </div>
          <div style={{ background: 'rgba(0, 230, 118, 0.05)', padding: '2px 0', borderRadius: '3px', border: '1px solid rgba(0, 230, 118, 0.1)' }}>
            <div style={{ color: 'var(--color-subtext)', fontSize: '7.5px' }}>強支撐位</div>
            <strong style={{ color: 'var(--color-neon-green)', fontSize: '9.5px', fontWeight: 900 }}>{support.toFixed(1)}</strong>
          </div>
          <div style={{ background: 'rgba(255, 214, 0, 0.05)', padding: '2px 0', borderRadius: '3px', border: '1px solid rgba(255, 214, 0, 0.1)' }}>
            <div style={{ color: 'var(--color-subtext)', fontSize: '7.5px' }}>風控停損</div>
            <strong style={{ color: 'var(--color-neon-yellow)', fontSize: '9.5px', fontWeight: 900 }}>{stopLoss.toFixed(1)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
