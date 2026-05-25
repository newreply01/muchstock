const { pool } = require('../db');

const reports = [
    { symbol: '8131', score: 74, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 反彈力道強勁，站穩關鍵均線。 |
| 估值 (Valuation) | 45 | PE 位元歷史上緣，但反映轉機。 |
| 質量 (Quality) | 70 | 記憶體封測龍頭，營運效率穩定。 |
| 成長 (Growth) | 75 | 期待 2026 記憶體庫存回補紅利。 |
| 波動性 (Volatility) | 60 | 隨產業循環波動明顯。 |
| 情情緒 (Sentiment) | 75 | 法人認同度回升，外資反手回補。 |
| 宏觀 (Macro) | 80 | 全球記憶體景氣觸底回溫。 |

**投資評級：【買入】**

- **建議**：福懋科隨記憶體族群聯動，目前具備明確的補漲空間。` },
    { symbol: '6944', score: 82, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 90 | 強勢噴出，突破歷史新高區域。 |
| 估值 (Valuation) | 40 | 高成長溢價雖高，但訂單能見度強。 |
| 質量 (Quality) | 85 | 專業水處理系統，具備高客制化門檻。 |
| 成長 (Growth) | 85 | 受惠半導體擴廠對水資源回收的剛需。 |
| 波動性 (Volatility) | 65 | 股性偏強且有量。 |
| 情情緒 (Sentiment) | 80 | 長線資金鎖碼，籌碼穩定度高。 |
| 宏觀 (Macro) | 85 | 淨零排放與循環經濟政策長期受惠。 |

**投資評級：【強力買入】**

- **分析**：兆聯實業為台積電供應鏈隱形冠軍，隨擴廠進程獲利具想像空間。` },
    { symbol: '3374', score: 78, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 股價震盪向上，支撐力道轉強。 |
| 估值 (Valuation) | 50 | 評價合理，反映 3D 封裝技術優勢。 |
| 質量 (Quality) | 85 | 台積電集團成員，技術與訂單無憂。 |
| 成長 (Growth) | 80 | 手機 CIS 封裝回暖與新應用擴張。 |
| 波動性 (Volatility) | 70 | 屬於穩健權值型標的。 |
| 情情緒 (Sentiment) | 85 | 集團加持，內外資持股意願高。 |
| 宏觀 (Macro) | 85 | 半導體先進封裝的大趨勢受益者。 |

**投資評級：【買入】**

- **評語**：精材為長線配置半導體先進封裝族群的重要防禦標的。` },
    { symbol: '3455', score: 69, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 70 | 指標黃金交叉，帶量突破整理區。 |
| 估值 (Valuation) | 45 | 現階段估值反映傳統設備淡季。 |
| 質量 (Quality) | 65 | AOI 技術深耕，具備多樣化產業應用。 |
| 成長 (Growth) | 70 | 期待載板產能重啟後的設備拉貨。 |
| 波動性 (Volatility) | 65 | 位階相對穩定。 |
| 情情緒 (Sentiment) | 65 | 法人觀望情緒轉為保守買進。 |
| 宏觀 (Macro) | 70 | 智慧製造轉型需求支撐長線。 |

**投資評級：【中性偏多】**

- **建議**：由田處於基本面修復期，建議逢低分批佈局。` },
    { symbol: '2328', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | 股價盤底後試圖站上季線。 |
| 估值 (Valuation) | 65 | 具備集團標的之相對補漲估值。 |
| 質量 (Quality) | 70 | 鴻海集團連接器核心供應，穩健性高。 |
| 成長 (Growth) | 70 | 車用電子與 伺服器線纜訂單成長預期。 |
| 波動性 (Volatility) | 75 | 股價具備集團股特有的穩定性。 |
| 情情緒 (Sentiment) | 70 | 集團股聯動效應帶動資金關注。 |
| 宏觀 (Macro) | 75 | 全球電子產業復甦與 EV 滲透率提升。 |

**投資評級：【買入】**

- **分析**：廣宇為鴻海 3+3 策略下的關鍵零組件受益者。` }
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
        console.log('✅ Batch 8 (Part 3) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
