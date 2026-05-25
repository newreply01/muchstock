const { pool } = require('../db');

const reports = [
    { symbol: '4939', score: 65, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 股價區間平台整理。 |
| 估值 (Valuation) | 60 | 基期中等。 |
| 質量 (Quality) | 65 | LED 驅動 IC 穩定。 |
| 成長 (Growth) | 60 | 隨面貌景氣波動。 |
| 波動性 (Volatility) | 70 | 波動率低。 |
| 情緒 (Sentiment) | 55 | 散戶持有力道高。 |
| 宏觀 (Macro) | 60 | 消費性電子復甦。 |

**投資評級：【中性】**

- **建議**：具備現金殖利率保護，但缺乏強烈補漲動能。` },
    { symbol: '6167', score: 78, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 強勢反彈至季線上。 |
| 估值 (Valuation) | 65 | 獲利支撐股價。 |
| 質量 (Quality) | 80 | 專業代工模組技術。 |
| 成長 (Growth) | 75 | 客戶庫存回補需求強。 |
| 波動性 (Volatility) | 60 | 具備波段特性。 |
| 情緒 (Sentiment) | 70 | 內資主力鎖籌碼。 |
| 宏觀 (Macro) | 65 | 電子製造服務復甦。 |

**投資評級：【買入】**

- **分析**：久正為低基期轉機標的。` },
    { symbol: '2889', score: 82, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 70 | 金融族群先行指標。 |
| 估值 (Valuation) | 75 | 現金股利優厚。 |
| 質量 (Quality) | 85 | 獲利穩健度優於民營同業。 |
| 成長 (Growth) | 65 | 穩定成長。 |
| 波動性 (Volatility) | 90 | 波動極低。 |
| 情緒 (Sentiment) | 75 | 法人定存型配置買進。 |
| 宏觀 (Macro) | 85 | 升息環境下銀行端獲利佳。 |

**投資評級：【強力買入】**

- **建議**：國票金具備高息收與防禦性。` },
    { symbol: '6164', score: 70, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | 均線向上。 |
| 估值 (Valuation) | 60 | 低價股。 |
| 質量 (Quality) | 65 | 電源線供應。 |
| 成長 (Growth) | 70 | 受惠工控新訂單。 |
| 波動性 (Volatility) | 55 | 具爆發力。 |
| 情緒 (Sentiment) | 60 | 法人小量佈局。 |
| 宏觀 (Macro) | 60 | 硬體零組件成長。 |

**投資評級：【買入】**

- **評語**：華興具備轉機題材。` }
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
        console.log('✅ Batch 7 (Part 1) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
