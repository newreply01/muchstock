const { pool } = require('../db');

const reports = [
    { symbol: '2453', score: 83, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 90 | 出現「紅三兵」多頭攻擊型態，強勢放量。 |
| 估值 (Valuation) | 65 | 低於 SI 族群平均，具備評價修復空間。 |
| 質量 (Quality) | 75 | 專注金融與政府數位轉型，營運現金流極強。 |
| 成長 (Growth) | 85 | AI 應用落地帶動專案量與毛利雙升。 |
| 波動性 (Volatility) | 65 | 具備波段進攻性。 |
| 情緒 (Sentiment) | 85 | 法人操作轉趨積極，多頭氣氛濃厚。 |
| 宏觀 (Macro) | 80 | 數位國家政策與資安紅利之長線受益者。 |

**投資評級：【強力買入】**

- **建議**：凌群具備技術領先與政策紅利，為軟體開發族群之首選。` },
    { symbol: '3060', score: 66, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 長期大底初步止跌，等待量能回溫。 |
| 估值 (Valuation) | 75 | 位階極低，具備高度安全邊際。 |
| 質量 (Quality) | 60 | HDD 零組件市場飽和，轉向高精度加工技術。 |
| 成長 (Growth) | 65 | 期待利基型應用的轉型成效。 |
| 波動性 (Volatility) | 85 | 波動較小，呈現築底特徵。 |
| 情情緒 (Sentiment) | 60 | 市場冷門股，等待利多觸發。 |
| 宏觀 (Macro) | 60 | 期待儲存設備市場之大數據存儲紅利。 |

**投資評級：【買入】**

- **建議**：銘異適合低风险偏好的價值派，作為底部布局之用。` },
    { symbol: '3704', score: 71, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 展現補漲動能，「紅三兵」初步成型。 |
| 估值 (Valuation) | 70 | 股價委屈，相對網通龍頭具備比價優勢。 |
| 質量 (Quality) | 65 | 全球品牌力強，但獲利受匯率與零組件成本影響。 |
| 成長 (Growth) | 60 | FWA 與 Wi-Fi 7 為2026年核心動能。 |
| 波動性 (Volatility) | 70 | 底部放量後股性轉趨活潑。 |
| 情緒 (Sentiment) | 75 | 市場重新審視網通族群之評價地位。 |
| 宏觀 (Macro) | 85 | 全球寬頻基礎建設普及與雲端管理需求。 |

**投資評級：【買入】**

- **分析**：合勤控具備強大的技術儲備，為網通升級潮中的長線穩健選擇。` },
    { symbol: '3032', score: 75, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 回測五日線後強勢反彈，突破長期頸線。 |
| 估值 (Valuation) | 45 | 反映其機殼與散熱轉型之題材溢價。 |
| 質量 (Quality) | 75 | 車用電源與伺服器機殼佈局紮實，利潤率升。 |
| 成長 (Growth) | 85 | 配合大股東之 AI Server 出貨，能見度高。 |
| 波動性 (Volatility) | 50 | 股價跳躍幅度大，適合波段好手。 |
| 情緒 (Sentiment) | 85 | 市場熱錢重新進駐機殼族群，認同度回升。 |
| 宏觀 (Macro) | 80 | 受惠邊緣運算與電競市場之硬體更新。 |

**投資評級：【強力買入】**

- **建議**：偉訓基本面轉強且具備關鍵客戶挹注，波段操作首選。` },
    { symbol: '3317', score: 79, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 指標翻揚，脫離整理區間向上表態。 |
| 估值 (Valuation) | 60 | PE 反映高成長性，尚在合理範圍。 |
| 質量 (Quality) | 70 | 高階功率元件技術成熟，受惠替代紅利。 |
| 成長 (Growth) | 85 | 1月營收動能勁揚，受惠車用與工控 MOSFET。 |
| 波動性 (Volatility) | 65 | 半導體中型股特有的活潑走勢。 |
| 情情緒 (Sentiment) | 80 | 外資近期買盤集中於功率元件領先股。 |
| 宏觀 (Macro) | 90 | 全球電力電子與節能趨勢對 MOSFET 之剛需。 |

**投資評級：【強力買入】**

- **分析**：尼克森具備高 Beta 屬性與強業績支撐，為半導體板塊之亮點。` }
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
        console.log('✅ Batch 8 (Part 10) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
