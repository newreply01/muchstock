const { pool } = require('../db');

const reports = [
    { symbol: '9908', score: 68, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 股價低檔轉強，帶量站上月線。 |
| 估值 (Valuation) | 85 | PB 僅 1.08，具備防禦價值。 |
| 質量 (Quality) | 80 | 大台北瓦斯區域龍頭，現金流極穩。 |
| 成長 (Growth) | 50 | 公用事業成長有限，隨人口密度微增。 |
| 波動性 (Volatility) | 90 | 市場波動時的避風港。 |
| 情情緒 (Sentiment) | 60 | 存股型資金穩定持有。 |
| 宏觀 (Macro) | 70 | 受惠通膨環境下的費率轉嫁能力。 |

**投資評級：【買入】**

- **建議**：適合追求低波動與穩定配息的保守型投資者。` },
    { symbol: '2897', score: 85, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 90 | 多頭排列，股價正式突破 10 元面額。 |
| 估值 (Valuation) | 95 | PB 0.68 極度低估，殖利率 5.3%。 |
| 質量 (Quality) | 80 | 2025 年盈餘分配擬創掛牌新高。 |
| 成長 (Growth) | 75 | 數位銀行轉型有成，獲利動能轉強。 |
| 波動性 (Volatility) | 85 | 金融股抗震特性。 |
| 情情緒 (Sentiment) | 85 | 外資翻多，內資存股族積極追價。 |
| 宏觀 (Macro) | 80 | 銀行端獲利受惠高利率環境。 |

**投資評級：【強力買入】**

- **分析**：王道銀行具備極高價值修復空間，殖利率誘人且基本面反轉。` },
    { symbol: '6217', score: 79, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 95 | 連續噴出大漲，2月營收推升動能。 |
| 估值 (Valuation) | 45 | 現階段反映未來兩年成長空間。 |
| 質量 (Quality) | 75 | 探針組件具備高度訂製化毛利。 |
| 成長 (Growth) | 85 | 2月營收年增 42.9%，AI 佈局展現成果。 |
| 波動性 (Volatility) | 50 | 股性活潑。 |
| 情情緒 (Sentiment) | 75 | 主力積極作多。 |
| 宏觀 (Macro) | 80 | 半導體封測設備國產化重要一環。 |

**投資評級：【強力買入】**

- **建議**：中探針受惠 AI 測試需求，為小而美的噴發標的。` },
    { symbol: '7769', score: 83, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 獲選 0050 成分股，被動資金進駐。 |
| 估值 (Valuation) | 30 | PB 飆高反映其 CoWoS 設備龍頭溢價。 |
| 質量 (Quality) | 95 | 高端半導體設備測試能力全球領先。 |
| 成長 (Growth) | 95 | 隨台積電 CoWoS 擴產，訂單排至明年。 |
| 波動性 (Volatility) | 50 | 低成交量時波動大。 |
| 情情緒 (Sentiment) | 90 | 機構法人與 ETF 基金強迫配置。 |
| 宏觀 (Macro) | 95 | 處於半導體先進封裝的大循環頂峰。 |

**投資評級：【強力買入】**

- **評語**：鴻勁雖貴，但具備壟斷與成分股稀缺紅利。` },
    { symbol: '4123', score: 66, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 股價築底反彈，站穩十日線。 |
| 估值 (Valuation) | 80 | 底層資產價值顯著高於目前股價。 |
| 質量 (Quality) | 65 | 生技投控龍頭，資產流動性強。 |
| 成長 (Growth) | 60 | 期待旗下轉投資公司掛牌或授權收入。 |
| 波動性 (Volatility) | 70 | 生技股相對平穩之標的。 |
| 情情緒 (Sentiment) | 65 | 法人溫和承接。 |
| 宏觀 (Macro) | 65 | 生技產業景氣持穩。 |

**投資評級：【買入】**

- **分析**：晟德具備投控資產修復與防禦性價值。` }
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
        console.log('✅ Batch 8 (Part 2) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
