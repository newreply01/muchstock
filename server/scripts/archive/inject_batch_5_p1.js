const { pool } = require('../db');

const reports = [
    { symbol: '1504', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 50 | 股價盤整，量能縮減。 |
| 估值 (Valuation) | 60 | PE 31, PB 1.79，長期避險價值浮現。 |
| 質量 (Quality) | 55 | 獲利穩定，四大事業群重組中。 |
| 成長 (Growth) | 65 | 法說會展望 AIDC 營收倍增。 |
| 波動性 (Volatility) | 50 | 低波動特徵，適合防守。 |
| 情緒 (Sentiment) | 50 | 外資短買後轉觀望。 |
| 宏觀 (Macro) | 55 | 受惠電改與儲能政策。 |

**投資評級：【買入】**

- **技術分析**：近期在 70 元關卡震盪。
- **展望**：法說會釋出轉型訊號，營運預計先蹲後跳，具備防守反擊能力。` },
    { symbol: '1536', score: 45, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 35 | RSI 35, 處於空頭控盤區。 |
| 估值 (Valuation) | 60 | PB 1.85，基期已低。 |
| 質量 (Quality) | 40 | 獲利受車市放緩影響。 |
| 成長 (Growth) | 30 | 營收動能尚未顯現。 |
| 波動性 (Volatility) | 39 | 空頭貫穿，風險仍存。 |
| 情緒 (Sentiment) | 40 | 法人持續站賣方。 |
| 宏觀 (Macro) | 45 | 全球車用組件需求乏力。 |

**投資評級：【中性】**

- **建議**：技術面指標破底，等底部信號出現後再考慮，目前不急於進場。` },
    { symbol: '1722', score: 88, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 90 | MA5/10/20 全面翻揚。 |
| 估值 (Valuation) | 80 | PB 0.86 超低估值，具安全邊際。 |
| 質量 (Quality) | 60 | 體質改善，瞄準半導體特化。 |
| 成長 (Growth) | 70 | 轉型商機帶動股價表現。 |
| 波動性 (Volatility) | 77 | 低波動穩健攀升。 |
| 情緒 (Sentiment) | 75 | 外資明顯偏多佈局。 |
| 宏觀 (Macro) | 65 | 半導體國產化關鍵受益股。 |

**投資評級：【強力買入】**

- **亮點**：低股價淨值比加上半導體特用化學品轉型成功，是目前最佳價值型與轉機型兼備的標的。` },
    { symbol: '2332', score: 40, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 45 | 均線糾結，動能不足。 |
| 估值 (Valuation) | 60 | 股價低迷，淨值比尚可。 |
| 質量 (Quality) | 30 | 獲利能力需持續觀察。 |
| 成長 (Growth) | 35 | 營收無顯著突破。 |
| 波動性 (Volatility) | 41 | 隨波逐流，缺乏單獨走勢。 |
| 情緒 (Sentiment) | 40 | 外資持股意願低。 |
| 宏觀 (Macro) | 45 | 網通低階市場競爭激烈。 |

**投資評級：【賣出】**

- **分析**：基本面疲弱且無強大題材支撐。` },
    { symbol: '2345', score: 84, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 網通族群龍頭，股價強勢整理。 |
| 估值 (Valuation) | 50 | 高本益比反映高成長。 |
| 質量 (Quality) | 85 | 客戶集中度高，獲利質量穩健。 |
| 成長 (Growth) | 88 | 受惠 800G 交換器出貨潮。 |
| 波動性 (Volatility) | 60 | 股性活潑但不失穩健。 |
| 情緒 (Sentiment) | 82 | 主力投信長期鎖籌碼。 |
| 宏觀 (Macro) | 85 | AI 資料中心基建關鍵受益。 |

**投資評級：【強力買入】**

- **建議**：長線受惠 AI 基建，拉回即是買點。` },
    { symbol: '2368', score: 82, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 指標偏多，走勢落後補漲。 |
| 估值 (Valuation) | 60 | 相較同業具補漲空間。 |
| 質量 (Quality) | 70 | 伺服器板比重提升。 |
| 成長 (Growth) | 80 | AI 伺服器供應鏈受益。 |
| 波動性 (Volatility) | 55 | 近期波動加劇。 |
| 情緒 (Sentiment) | 75 | 法人轉積極加碼。 |
| 宏觀 (Macro) | 70 | AI 浪潮下的 PCB 關鍵供應。 |

**投資評級：【買入】**

- **分析**：金像電之後的 PCB 轉機股。` },
    { symbol: '2379', score: 86, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 股王氣勢，高檔整理後放量突破。 |
| 估值 (Valuation) | 45 | 報價已高，但在合理範疇內。 |
| 質量 (Quality) | 90 | Net Income Margin 優於同業。 |
| 成長 (Growth) | 85 | Wi-Fi 7 / 乙太網路升級動能。 |
| 波動性 (Volatility) | 65 | 穩定成長股。 |
| 情情緒 (Sentiment) | 88 | 內外資同步加碼。 |
| 宏觀 (Macro) | 80 | 邊緣運算晶片龍頭。 |

**投資評級：【強力買入】**

- **建議**：IC 設計族群核心，適合中長線分批佈局。` },
    { symbol: '2393', score: 65, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 整理區間。 |
| 估值 (Valuation) | 70 | 現金殖利率吸引人。 |
| 質量 (Quality) | 60 | LED 本業回溫。 |
| 成長 (Growth) | 50 | 穩定增長。 |
| 波動性 (Volatility) | 70 | 極度穩定。 |
| 情緒 (Sentiment) | 55 | 法人觀望。 |
| 宏觀 (Macro) | 50 | 面板背光需求回升。 |

**投資評級：【中性】**

- **分析**：定存股特質，爆發力稍欠。` },
    { symbol: '2404', score: 62, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 50 | 低檔徘徊。 |
| 估值 (Valuation) | 65 | 低基期。 |
| 質量 (Quality) | 55 | 財務文件尚可。 |
| 成長 (Growth) | 40 | 轉型力道不足。 |
| 波動性 (Volatility) | 60 | 平穩。 |
| 情緒 (Sentiment) | 45 | 缺乏亮點。 |
| 宏觀 (Macro) | 45 | 通用設備業寒冬。 |

**投資評級：【中性】**

- **分析**：目前非盤面重心。` },
    { symbol: '2412', score: 80, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 50 | 防守指標。 |
| 估值 (Valuation) | 85 | 市場動盪時期的最佳避風港。 |
| 質量 (Quality) | 95 | 現金流充沛且壟斷度高。 |
| 成長 (Growth) | 40 | 緩慢成長。 |
| 波動性 (Volatility) | 95 | 無敵抗震。 |
| 情緒 (Sentiment) | 65 | 保險資金長線持有。 |
| 宏觀 (Macro) | 95 | 防禦型配置首選。 |

**投資評級：【強力買入 (防守配置)】**

- **建議**：大盤高點震盪下的核心資產避雷針。` }
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
        console.log('✅ Batch 5 (Part 1) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
