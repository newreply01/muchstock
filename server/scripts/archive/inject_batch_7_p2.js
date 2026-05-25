const { pool } = require('../db');

const reports = [
    { symbol: '2634', score: 85, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 82 | 軍工浪潮帶動，強勢站上年線。 |
| 估值 (Valuation) | 65 | 訂單能見度長，估值具吸引力。 |
| 質量 (Quality) | 88 | 航太與國防維修技術門檻高，獲利穩。 |
| 成長 (Growth) | 90 | 受惠 F-16 維修中心與波音零件供應鏈。 |
| 波動性 (Volatility) | 65 | 股性偏強。 |
| 情情緒 (Sentiment) | 85 | 法人積極買入配置。 |
| 宏觀 (Macro) | 95 | 國防自主化政策龍頭。 |

**投資評級：【強力買入】**

- **建議**：漢翔為台灣軍工核心，長線具備轉機與成長雙重題材。` },
    { symbol: '2458', score: 79, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | AI PC 概念帶動放量。 |
| 估值 (Valuation) | 55 | 獲利支撐高檔整理。 |
| 質量 (Quality) | 82 | 觸控與指點桿技術全球領先。 |
| 成長 (Growth) | 75 | AI PC 換機潮利多。 |
| 波動性 (Volatility) | 60 | 平穩震盪向上。 |
| 情情緒 (Sentiment) | 80 | 內資主力持續鎖倉。 |
| 宏觀 (Macro) | 70 | 筆電產業觸底回暖。 |

**投資評級：【買入】**

- **評語**：AI PC 浪潮下的關鍵 IC 設計受益者。` },
    { symbol: '2543', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 低基期補漲。 |
| 估值 (Valuation) | 75 | 本益比具吸引力。 |
| 質量 (Quality) | 65 | 大部工程獲利轉正。 |
| 成長 (Growth) | 70 | 公建案量充足。 |
| 波動性 (Volatility) | 60 | 持穩。 |
| 情緒 (Sentiment) | 65 | 法人開始關注。 |
| 宏觀 (Macro) | 65 | 政策推動大型公建。 |

**投資評級：【買入】**

- **分析**：皇昌為國內公共工程主要龍頭。` }
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
        console.log('✅ Batch 7 (Part 2) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
