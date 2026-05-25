const { pool } = require('../db');

const reports = [
    { symbol: '3028', score: 79, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 均線轉強，獲利預期推升股價表態。 |
| 估值 (Valuation) | 65 | 本益比相對歷史水位仍具吸引力。 |
| 質量 (Quality) | 80 | 電子零件通路龍頭之一，渠道能力極強。 |
| 成長 (Growth) | 85 | 受惠 AI 與車用半導體拉貨與庫存回補。 |
| 波動性 (Volatility) | 70 | 雖股價爬升，但成交量配合健康。 |
| 情情緒 (Sentiment) | 75 | 法人操作轉向積極，認同度提升。 |
| 宏觀 (Macro) | 80 | 隨半導體週期回升，通路商獲利水漲船高。 |

**投資評級：【強力買入】**

- **建議**：增強受惠 1月營收爆發，具備高殖利率護體，為通路股之首選標的。` },
    { symbol: '5469', score: 81, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 底部帶量突破，技術指標翻多。 |
| 估值 (Valuation) | 85 | PB 僅 1.30 且 PE 13 倍，極具評價修復空間。 |
| 質量 (Quality) | 80 | PCB 產業老牌龍頭，管理效能卓越。 |
| 成長 (Growth) | 85 | 2月營收年增 38%，成長力道顯著。 |
| 波動性 (Volatility) | 75 | 股價具備明確防禦力。 |
| 情情緒 (Sentiment) | 80 | 法人針對低位階 PCB 股進行積極補貨。 |
| 宏觀 (Macro) | 80 | 筆電與伺服器市場復甦紅利。 |

**投資評級：【強力買入】**

- **建議**：瀚宇博具備紮實基本面與低位階優勢，為價值與成長兼具標的。` },
    { symbol: '3135', score: 77, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 營收喜訊帶動噴出後高檔震盪。 |
| 估值 (Valuation) | 30 | PE 反映高成長預期，故得分較低。 |
| 質量 (Quality) | 75 | 記憶體模組與快閃記憶體技術穩定。 |
| 成長 (Growth) | 95 | 2月營收年增 104%，爆發力全台領先。 |
| 波動性 (Volatility) | 55 | 股性高度活潑，適合波段。 |
| 情情緒 (Sentiment) | 80 | 市場熱錢追逐記憶體漲價題材標的。 |
| 宏觀 (Macro) | 85 | 全球記憶體供應鏈緊張與需求回暖雙利多。 |

**投資評級：【強力買入】**

- **評語**：凌航處於營運極速擴張期，適合追求動能與爆發力的投資者。` },
    { symbol: '2903', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 股價穩定攀升，緩步向填息路邁進。 |
| 估值 (Valuation) | 85 | 殖利率 5.3% 且 PB 僅 1.07。 |
| 質量 (Quality) | 75 | 台灣百貨零售巨頭，物業價值高。 |
| 成長 (Growth) | 65 | 穩定成長，期待大型節慶促銷效益。 |
| 波動性 (Volatility) | 85 | 股性防禦抗震。 |
| 情情緒 (Sentiment) | 65 | 市場資金避險之選。 |
| 宏觀 (Macro) | 70 | 台灣民間消費動能仍強，基本面無虞。 |

**投資評級：【買入】**

- **建議**：遠百為高股息投資與資產配置的優選標的。` },
    { symbol: '3056', score: 68, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 股價盤整，等待指標站回十日線。 |
| 估值 (Valuation) | 90 | 低本益比且具備高建設淨值。 |
| 質量 (Quality) | 70 | 台中建商龍頭轉型品牌，案源穩定。 |
| 成長 (Growth) | 60 | 隨各建案入帳週期認列獲利。 |
| 波動性 (Volatility) | 80 | 抗跌性強。 |
| 情情緒 (Sentiment) | 65 | 房地產政策趨穩後利空出盡。 |
| 宏觀 (Macro) | 60 | 期待利率見頂後對營造業的回暖。 |

**投資評級：【買入】**

- **分析**：富華新具備資產價值支撐，目前位階低，適合中長期置產。` }
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
        console.log('✅ Batch 8 (Part 5) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
