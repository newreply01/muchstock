const { pool } = require('../db');

const reports = [
    { symbol: '1513', score: 86, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 88 | 股價盤頂後放量突破，趨勢極強。 |
| 估值 (Valuation) | 45 | 本益比已反映未來 2 年成長。 |
| 質量 (Quality) | 85 | 重電設備龍頭，台電強韌電網計畫核心受益。 |
| 成長 (Growth) | 90 | 訂單能見度直達 2030 年。 |
| 波動性 (Volatility) | 60 | 股性驃悍。 |
| 情緒 (Sentiment) | 85 | 內資投信與外資同步鎖倉。 |
| 宏觀 (Macro) | 95 | 綠能、氫能及電力系統升級趨勢。 |

**投資評級：【強力買入】**

- **建議**：政策紅利龍頭，拉回 10 日線即是買點。` },
    { symbol: '1514', score: 82, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 跟隨重電族群補漲。 |
| 估值 (Valuation) | 55 | 相較華城、中興電仍具CP值。 |
| 質量 (Quality) | 75 | 電機設備專業廠。 |
| 成長 (Growth) | 80 | 台電與半導體建案電力系統供貨。 |
| 波動性 (Volatility) | 65 | 波動較大。 |
| 情緒 (Sentiment) | 75 | 法人認同度提升。 |
| 宏觀 (Macro) | 85 | 電網轉型受益股。 |

**投資評級：【買入】**

- **評語**：電力設備二線龍頭，補漲力道強。` },
    { symbol: '2377', score: 78, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 70 | 筆電與顯示卡市場回溫。 |
| 估值 (Valuation) | 60 | 低於技嘉(2376)，具補漲空間。 |
| 質量 (Quality) | 80 | 電競品牌龍頭，獲利能力穩健。 |
| 成長 (Growth) | 75 | AI PC 與伺服器產品線擴張。 |
| 波動性 (Volatility) | 60 | 穩健緩漲。 |
| 情情緒 (Sentiment) | 70 | 外資持股穩定增加。 |
| 宏觀 (Macro) | 75 | 電競與 AI 終端硬體升級。 |

**投資評級：【買入】**

- **分析**：電競信仰龍頭，AI PC 浪潮下的獲利保證。` },
    { symbol: '2371', score: 45, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 40 | 走勢疲軟，低於所有均線。 |
| 估值 (Valuation) | 65 | 低價資管概念。 |
| 質量 (Quality) | 40 | 本業獲利仍待改善。 |
| 成長 (Growth) | 35 | 轉型步調緩慢。 |
| 波動性 (Volatility) | 50 | 股性沉悶。 |
| 情緒 (Sentiment) | 40 | 法人出貨為主。 |
| 宏觀 (Macro) | 45 | 家電市場飽和。 |

**投資評級：【賣出】**

- **建議**：缺乏新成長動能，資金效率低。` },
    { symbol: '8086', score: 80, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | PA 族群底部成型，放量上攻。 |
| 估值 (Valuation) | 55 | 獲利爆發期已至。 |
| 質量 (Quality) | 80 | 砷化鎵代工前二大。 |
| 成長 (Growth) | 85 | 手機 PA 與 Wi-Fi 7 / 衛星通訊需求。 |
| 波動性 (Volatility) | 55 | 股性回溫。 |
| 情情緒 (Sentiment) | 80 | 投信回頭重金買超。 |
| 宏觀 (Macro) | 75 | 5G/6G 通訊升級核心。 |

**投資評級：【強力買入】**

- **分析**：通訊晶片核心，受惠手機市況全面復甦。` }
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
        console.log('✅ Batch 6 (Part 2) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
