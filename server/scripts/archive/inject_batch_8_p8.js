const { pool } = require('../db');

const reports = [
    { symbol: '1712', score: 71, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 股價處於橫向盤整，波動率低。 |
| 估值 (Valuation) | 85 | 殖利率達 5.42%，具備極強的下檔保護。 |
| 質量 (Quality) | 75 | 農化與超市物流雙核心，營運非常穩定。 |
| 成長 (Growth) | 65 | 隨全球農業循環波動，成長動能平穩。 |
| 波動性 (Volatility) | 85 | 典型的民生防禦股，適合避險。 |
| 情情緒 (Sentiment) | 65 | 市場冷門但穩定，籌碼多為長線大戶。 |
| 宏觀 (Macro) | 70 | 受惠極端氣候導致的糧食保護主義與農藥需求。 |

**投資評級：【買入】**

- **建議**：興農適合追求高息且不偏好劇烈波動的投資者。` },
    { symbol: '6446', score: 89, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 長期走勢向上，盤整後再度發動可期。 |
| 估值 (Valuation) | 30 | 反映生物製藥之高增長前景，現值溢價高。 |
| 質量 (Quality) | 90 | 藥物品類具備國際專利護城河，獲利能力強。 |
| 成長 (Growth) | 95 | Ropeg 全球銷售持續破紀錄，EPS 爆發。 |
| 波動性 (Volatility) | 55 | 生技股通病，對臨床或監管新聞敏感。 |
| 情情緒 (Sentiment) | 90 | 外資與投信高度共識，看好全球滲透率。 |
| 宏觀 (Macro) | 95 | 罕見疾病治療為生技產業之最抗景氣循環領域。 |

**投資評級：【強力買入】**

- **分析**：藥華藥已進入營收獲利良性循環，為台灣生技股之標竿。` },
    { symbol: '3653', score: 85, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 95 | 強勢噴出，多頭排列極為陡峭。 |
| 估值 (Valuation) | 20 | PE/PB 高居全市場前列，處於極高估值。 |
| 質量 (Quality) | 95 | 散熱技術壟斷地位，獲利能力無懈可擊。 |
| 成長 (Growth) | 95 | 隨 AI Server 功耗提升，產品供不應求。 |
| 波動性 (Volatility) | 40 | 高價股特有的大起大落，心臟需強。 |
| 情情緒 (Sentiment) | 95 | 市場熱錢集中營，法人必備持股。 |
| 宏觀 (Macro) | 95 | AI 半導體長期爆發之絕對受益者。 |

**投資評級：【強力買入】**

- **評語**：健策為 AI 硬體之核心之核心，雖估值極高，但成長動能不墜。` },
    { symbol: '6176', score: 70, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 50 | 股價低位出現 Hammer 底部型態，具備止跌跡象。 |
| 估值 (Valuation) | 85 | PB 僅 1.24 且 PE 低於 11 倍，嚴重低估。 |
| 質量 (Quality) | 70 | 背光模組龍頭，技術實力與現金流優異。 |
| 成長 (Growth) | 60 | 受限於平板/筆電市場飽和，成長空間較窄。 |
| 波動性 (Volatility) | 80 | 指標過熱區後之修正已足。 |
| 情情緒 (Sentiment) | 65 | 等待外資回流面板相關族群。 |
| 宏觀 (Macro) | 60 | 全球電子庫存回補週期緩步啟動。 |

**投資評級：【中性偏多】**

- **建議**：瑞儀評價極具吸引力，適合價值型投資者進行底部布局。` },
    { symbol: '7780', score: 66, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | 新股掛牌後盤整震盪，尋求支撐。 |
| 估值 (Valuation) | 55 | 評價反映品牌價值，處於合理區間。 |
| 質量 (Quality) | 65 | 台灣保健食品之電商直營模式效率高。 |
| 成長 (Growth) | 75 | 隨市佔率擴散與產品線增加而具備動能。 |
| 波動性 (Volatility) | 50 | 新股股性跳躍。 |
| 情情緒 (Sentiment) | 65 | 散戶認同度高，等待更多法人報告。 |
| 宏觀 (Macro) | 65 | 高齡化社會對精準營養需求之長趨勢。 |

**投資評級：【買入】**

- **分析**：大研生醫具備強大的行銷與品牌實力，成長潛力值得關注。` }
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
        console.log('✅ Batch 8 (Part 8) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
