const { pool } = require('../db');

const reports = [
    { symbol: '2332', score: 38, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 40 | 均線空頭排列，價量齊縮。 |
| 估值 (Valuation) | 65 | 股價淨值比極低。 |
| 質量 (Quality) | 30 | 營運效率不彰，本業持續虧損。 |
| 成長 (Growth) | 35 | 市佔擴張受阻。 |
| 波動性 (Volatility) | 45 | 隨波逐流。 |
| 情緒 (Sentiment) | 40 | 法人進場意願極低。 |
| 宏觀 (Macro) | 45 | 低階網通市場紅海競爭。 |

**投資評級：【強力賣出】**

- **建議**：缺乏明確轉機與成長紅利，建議將資金轉向更高效率標的。` },
    { symbol: '2474', score: 75, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | 股價於箱底止跌，帶量上攻。 |
| 估值 (Valuation) | 80 | 現金部位極高，具收購或加息潛力。 |
| 質量 (Quality) | 70 | 獲利能力持穩，轉型布局高端醫材。 |
| 成長 (Growth) | 60 | 期待新業務貢獻。 |
| 波動性 (Volatility) | 85 | 防禦性強。 |
| 情情緒 (Sentiment) | 70 | 外資低檔悄悄回補。 |
| 宏觀 (Macro) | 65 | 手機零組件週期谷底回溫。 |

**投資評級：【買入】**

- **評語**：典型的資產股轉型標的，下檔空間有限。` }
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
        console.log('✅ Batch 7 (Part 4) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
