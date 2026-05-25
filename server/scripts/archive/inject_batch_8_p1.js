const { pool } = require('../db');

const reports = [
    { symbol: '5289', score: 88, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 單周漲幅 26%，強勢進入千金股。 |
| 估值 (Valuation) | 40 | 隨獲利噴發，本益比具備擴張空間。 |
| 質量 (Quality) | 90 | 工控與 AI 應用雙引擎，獲利極優。 |
| 成長 (Growth) | 95 | 2月營收年增 403%，極度爆發。 |
| 波動性 (Volatility) | 70 | 雖漲幅高，但結構穩健。 |
| 情緒 (Sentiment) | 80 | 資金瘋狂湧入 AI 記憶體族群。 |
| 宏觀 (Macro) | 90 | 全球 AI 算力需求支撐工控儲存。 |

**投資評級：【強力買入】**

- **建議**：宜鼎受惠 AI 與工控記憶體需求爆發，營運動能極強。` },
    { symbol: '2474', score: 75, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 底部放量止跌。 |
| 估值 (Valuation) | 90 | PB 僅 0.76，殖利率達 8.5%。 |
| 質量 (Quality) | 80 | 超高現金準備，轉型醫材進度順利。 |
| 成長 (Growth) | 60 | 期待新事業群雙位數成長。 |
| 波動性 (Volatility) | 85 | 防禦性極佳，下檔有撐。 |
| 情緒 (Sentiment) | 75 | 法人認同價值，低檔承接意願高。 |
| 宏觀 (Macro) | 70 | 筆電市場景氣復甦緩步。 |

**投資評級：【買入】**

- **評語**：高息收、低淨值比的價值投資首選，具備轉機題材。` },
    { symbol: '3665', score: 82, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 站穩中長期均線，目標價上調。 |
| 估值 (Valuation) | 55 | 反映高成長展望，評價處中性區位。 |
| 質量 (Quality) | 85 | 高端連接解決方案，毛利優異。 |
| 成長 (Growth) | 85 | FactSet 預估 EPS 與營收穩定擴張。 |
| 波動性 (Volatility) | 60 | 具高度成長股特徵。 |
| 情緒 (Sentiment) | 85 | 法人鎖籌碼，多頭趨勢不變。 |
| 宏觀 (Macro) | 80 | 全球資料中心與電動車雙重紅利。 |

**投資評級：【強力買入】**

- **建議**：貿聯-KY 為 AI 基礎建設核心線纜商，長線看俏。` },
    { symbol: '2049', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 均線轉強，帶量站上季線。 |
| 估值 (Valuation) | 45 | PE 偏高，反映復甦預期。 |
| 質量 (Quality) | 70 | 傳產機械龍頭，供應鏈管理成熟。 |
| 成長 (Growth) | 75 | FactSet 預估 2026 EPS 持續上修。 |
| 波動性 (Volatility) | 65 | 典型循環波動。 |
| 情緒 (Sentiment) | 70 | 外資翻多，融資券趨勢轉強。 |
| 宏觀 (Macro) | 75 | 期待全球製造業與機器人需求回溫。 |

**投資評級：【買入】**

- **分析**：上銀為自動化週期回升的主要受益指標。` },
    { symbol: '4903', score: 76, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 營收喜訊帶動噴出。 |
| 估值 (Valuation) | 50 | 轉機成長股評價高度波動。 |
| 質量 (Quality) | 70 | 獲利結構優化。 |
| 成長 (Growth) | 90 | 2月營收年增 103%，超越市場預期。 |
| 波動性 (Volatility) | 65 | 具備爆發性。 |
| 情緒 (Sentiment) | 70 | 市場資金追逐低位階轉機股。 |
| 宏觀 (Macro) | 75 | 5G 與光纖基礎建設訂單穩定。 |

**投資評級：【強力買入】**

- **建議**：聯光通營運動能極強，具備補漲潛力。` }
];

async function run() {
    try {
        for (const r of reports) {
            console.log('Injecting V3 report for ' + r.symbol + '...');
            await pool.query(
                'INSERT INTO ai_reports (symbol, content, sentiment_score, updated_at) ' +
                'VALUES ($1, $2, $3, NOW()) ' +
                'ON CONFLICT (symbol) ' +
                'DO UPDATE SET content = EXCLUDED.content, sentiment_score = EXCLUDED.sentiment_score, updated_at = NOW()',
                [r.symbol, r.report, r.score]
            );
        }
        console.log('✅ Batch 8 (Part 1) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
