const { pool } = require('../db');

const reports = [
    { symbol: '2812', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 緩步填息，股價穩定。 |
| 估值 (Valuation) | 80 | 現金殖利率極具吸引力。 |
| 質量 (Quality) | 75 | 地區性銀行龍頭，壞帳率低。 |
| 成長 (Growth) | 65 | 獲利隨放款量穩定擴張。 |
| 波動性 (Volatility) | 85 | 防禦型配置。 |
| 情緒 (Sentiment) | 65 | 存股大戶穩健持有。 |
| 宏觀 (Macro) | 75 | 利率環境有利銀行淨利差。 |

**投資評級：【買入】**

- **建議**：適合追求穩定息收的長期投資者，資產配置避風港。` },
    { symbol: '2834', score: 75, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 指標偏多，突破整理區。 |
| 估值 (Valuation) | 85 | 股價淨值比處於合理偏低區位。 |
| 質量 (Quality) | 70 | 公股背景保證，獲利穩步回溫。 |
| 成長 (Growth) | 65 | 中小企業放款需求持續。 |
| 波動性 (Volatility) | 90 | 市場抗震性強。 |
| 情緒 (Sentiment) | 70 | 內外資法人同步承接。 |
| 宏觀 (Macro) | 80 | 受惠政策金融支持。 |

**投資評級：【買入】**

- **評語**：公股金融股中的绩優生，低風險穩定成長標的。` },
    { symbol: '2851', score: 70, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 50 | 股價高檔橫盤。 |
| 估值 (Valuation) | 70 | 具備填權息空間。 |
| 質量 (Quality) | 75 | 再保市場領先地位。 |
| 成長 (Growth) | 60 | 投資收益回穩。 |
| 波動性 (Volatility) | 80 | 防禦性配置。 |
| 情緒 (Sentiment) | 55 | 籌碼相對集中。 |
| 宏觀 (Macro) | 75 | 利率平穩。 |

**投資評級：【中性偏多】**

- **分析**：具備穩定殖利率保護的利基金融股。` }
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
        console.log('✅ Batch 7 (Part 3) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
