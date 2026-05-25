const { pool } = require('../db');

const reports = [
    { symbol: '5443', score: 76, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 站穩中長期均線，量價結構穩健。 |
| 估值 (Valuation) | 40 | PE 較高，反映半導體設備轉型溢價。 |
| 質量 (Quality) | 80 | 設備核心技術紮實，切入先進封裝供應鏈。 |
| 成長 (Growth) | 85 | 受惠半導體廠本土設備採購比重提升。 |
| 波動性 (Volatility) | 60 | 成長股波動特性。 |
| 情情緒 (Sentiment) | 75 | 法人重啟評估，資金轉進設備族群。 |
| 宏觀 (Macro) | 85 | AI 算力基礎設施擴張帶動設備需求。 |

**投資評級：【強力買入】**

- **建議**：均豪基本面正經歷質變，隨先進封裝需求爆發，具備長線成長空間。` },
    { symbol: '1598', score: 67, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 70 | 股價低檔築底完成，開始向上挑戰年線。 |
| 估值 (Valuation) | 75 | PB 僅 0.75，具備極高安全邊際。 |
| 質量 (Quality) | 60 | 健身產業景氣循環谷底，營運效率改善中。 |
| 成長 (Growth) | 60 | 期待疫後健康管理市場回溫。 |
| 波動性 (Volatility) | 75 | 防禦性強。 |
| 情情緒 (Sentiment) | 65 | 市場冷門轉為溫和關注。 |
| 宏觀 (Macro) | 60 | 消費性零售市場回升速度仍待觀察。 |

**投資評級：【買入】**

- **分析**：岱宇為價值型投資標的，下檔風險有限，轉機動能值得期待。` },
    { symbol: '2641', score: 71, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 股價橫盤整理中。 |
| 估值 (Valuation) | 85 | PE < 10 倍，低估值優勢顯著。 |
| 質量 (Quality) | 75 | 散裝船隊合約策略穩健，獲利能力優。 |
| 成長 (Growth) | 65 | 期待全球基準利率下滑帶動大宗物資需求。 |
| 波動性 (Volatility) | 85 | 抗震性佳。 |
| 情情緒 (Sentiment) | 60 | 航運族群目前處於低吸納期。 |
| 宏觀 (Macro) | 65 | 全球貿易量緩步復甦。 |

**投資評級：【中性偏多】**

- **評語**：正德適合追求配息與避危風險的存股型配置。` },
    { symbol: '7712', score: 84, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 95 | 強勢噴出，連續跳空站穩新高點。 |
| 估值 (Valuation) | 50 | 快速反應成長預期，但未過熱。 |
| 質量 (Quality) | 80 | MOSFET 領域具備領先研發實力。 |
| 成長 (Growth) | 90 | 營收動能極強，市場佔有率擴張快。 |
| 波動性 (Volatility) | 50 | 多頭向上過程中的劇烈震盪。 |
| 情情緒 (Sentiment) | 85 | 市場熱錢高度認同，買盤積極。 |
| 宏觀 (Macro) | 85 | 車用電源與工業自動化長期紅利。 |

**投資評級：【強力買入】**

- **建議**：博盛半導體具備強大的價格彈性，為成長型投資的高優選標的。` },
    { symbol: '1218', score: 70, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 90 | 帶量突破平台，均線多頭發散。 |
| 估值 (Valuation) | 95 | 股利政策優於預期，價值重估中。 |
| 質量 (Quality) | 65 | 傳統食品大廠轉向多元經營。 |
| 成長 (Growth) | 60 | 寵物食品新產線為長線成長引擎。 |
| 波動性 (Volatility) | 80 | 食品股穩定性。 |
| 情情緒 (Sentiment) | 70 | 散戶與存股族認同度提升。 |
| 宏觀 (Macro) | 65 | 內需市場穩健復甦。 |

**投資評級：【強力買入】**

- **分析**：泰山具備高殖利率護體，且轉型題材具發展潛力。` }
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
        console.log('✅ Batch 8 (Part 4) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
