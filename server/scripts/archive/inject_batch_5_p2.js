const { pool } = require('../db');

const reports = [
    { symbol: '2439', score: 68, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 區間震盪，季線有支撐。 |
| 估值 (Valuation) | 65 | 歷史低檔區。 |
| 質量 (Quality) | 60 | 聲學龍頭，轉向車用佈局。 |
| 成長 (Growth) | 55 | 獲利逐步回溫。 |
| 波動性 (Volatility) | 60 | 波動適中。 |
| 情緒 (Sentiment) | 55 | 法人小幅調節。 |
| 宏觀 (Macro) | 50 | 關鍵零組件。 |

**投資評級：【中性偏多】**

- **建議**：適合波段操作，買黑不買紅。` },
    { symbol: '2449', score: 78, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 70 | 封測族群走勢整齊。 |
| 估值 (Valuation) | 75 | 高殖利率特徵。 |
| 質量 (Quality) | 70 | 獲利結構優化。 |
| 成長 (Growth) | 75 | AI 晶片封測需求帶動。 |
| 波動性 (Volatility) | 65 | 穩健緩跑。 |
| 情緒 (Sentiment) | 70 | 投信持續買超。 |
| 宏觀 (Macro) | 60 | 半導體後段核心。 |

**投資評級：【買入】**

- **建議**：具備高息收保護，下檔有撐。` },
    { symbol: '2454', score: 92, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 股價站穩所有均線。 |
| 估值 (Valuation) | 50 | 旗艦晶片出貨帶動獲利。 |
| 質量 (Quality) | 95 | 世界級 IC 設計水平。 |
| 成長 (Growth) | 90 | 天璣系列與 AI 邊緣運算領先。 |
| 波動性 (Volatility) | 75 | 龍頭股穩健性。 |
| 情情緒 (Sentiment) | 90 | 外資認錯回補。 |
| 宏觀 (Macro) | 95 | 台灣電子核心。 |

**投資評級：【強力買入】**

- **評語**：AI 手機元年，聯發科是唯一可與高通對抗的旗艦。` },
    { symbol: '2457', score: 74, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | 記憶體報價止跌回升。 |
| 估值 (Valuation) | 60 | 合理區間。 |
| 質量 (Quality) | 70 | 控制 IC 技術門檻高。 |
| 成長 (Growth) | 75 | 受惠 SSD 升級。 |
| 波動性 (Volatility) | 50 | 股性較活潑。 |
| 情緒 (Sentiment) | 65 | 內資主力最愛。 |
| 宏觀 (Macro) | 60 | 儲存產業循環向上。 |

**投資評級：【買入】**

- **分析**：群聯是儲存龍頭，具備技術領先優勢。` },
    { symbol: '2458', score: 76, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 70 | PC 換機潮預期。 |
| 估值 (Valuation) | 55 | 獲利穩定。 |
| 質量 (Quality) | 80 | 觸控 IC 全球市佔高。 |
| 成長 (Growth) | 70 | AI PC 指點桿與觸控升級。 |
| 波動性 (Volatility) | 65 | 穩定震盪。 |
| 情緒 (Sentiment) | 70 | 投信默默吃貨。 |
| 宏觀 (Macro) | 65 | NB 景氣回升。 |

**投資評級：【買入】**

- **評語**：績優老牌 IC 設計，補漲首選。` },
    { symbol: '2474', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 機殼族群回神。 |
| 估值 (Valuation) | 75 | 現金飽滿，淨值高。 |
| 質量 (Quality) | 70 | 轉型醫療與精密鑄造。 |
| 成長 (Growth) | 60 | 尋找新成長引擎。 |
| 波動性 (Volatility) | 80 | 持穩。 |
| 情緒 (Sentiment) | 65 | 法人進場佈局轉型題材。 |
| 宏觀 (Macro) | 55 | 產業外移陣痛期已過。 |

**投資評級：【買入】**

- **分析**：具備資產與轉型雙重概念。` },
    { symbol: '2492', score: 80, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 被動組件落底回升。 |
| 估值 (Valuation) | 70 | 基期相較 AI 股極低。 |
| 質量 (Quality) | 75 | 全球電阻龍頭。 |
| 成長 (Growth) | 65 | 車用與工控比重拉升。 |
| 波動性 (Volatility) | 60 | 盤整向上。 |
| 情緒 (Sentiment) | 75 | 融資洗清，籌碼乾淨。 |
| 宏觀 (Macro) | 70 | 電子大循環循環。 |

**投資評級：【強力買入】**

- **分析**：國巨是目前少數低基期、高競爭力的權值股。` },
    { symbol: '2498', score: 35, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 30 | 技術面破位。 |
| 估值 (Valuation) | 20 | 本益比過高（負值）。 |
| 質量 (Quality) | 20 | 虧損持續。 |
| 成長 (Growth) | 40 | 元宇宙願景浩大。 |
| 波動性 (Volatility) | 30 | 下行風險。 |
| 情緒 (Sentiment) | 30 | 失望性賣壓湧現。 |
| 宏觀 (Macro) | 20 | 生態系尚未成熟。 |

**投資評級：【強力賣出】**

- **建議**：具備題材但財報數據極差，避開。` },
    { symbol: '2606', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | BDI 指數反彈。 |
| 估值 (Valuation) | 65 | 獲利回溫。 |
| 質量 (Quality) | 60 | 散裝船龍頭。 |
| 成長 (Growth) | 65 | 船隊現代化优势。 |
| 波動性 (Volatility) | 50 | 與運價高度掛鉤。 |
| 情緒 (Sentiment) | 60 | 長線資金進駐。 |
| 宏觀 (Macro) | 65 | 全球糧食與礦產貿易回溫。 |

**投資評級：【買入】**

- **評語**：散裝景氣回溫，佈局優質個股。` },
    { symbol: '2607', score: 70, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 航運族群溫和。 |
| 估值 (Valuation) | 65 | 股利政策穩健。 |
| 質量 (Quality) | 65 | 倉儲物流利潤穩。 |
| 成長 (Growth) | 55 | 隨貨運量變動。 |
| 波動性 (Volatility) | 70 | 低於海運三雄。 |
| 情緒 (Sentiment) | 60 | 安心股。 |
| 宏觀 (Macro) | 60 | 台灣進出口貿易支撐。 |

**投資評級：【中性偏多】**

- **建議**：防守穩定型航運股。` }
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
        console.log('✅ Batch 5 (Part 2) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
