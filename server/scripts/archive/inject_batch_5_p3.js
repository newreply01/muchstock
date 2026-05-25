const { pool } = require('../db');

const reports = [
    { symbol: '2611', score: 64, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 觀光復甦預期中，股價橫盤。 |
| 估值 (Valuation) | 65 | 獲利修復中。 |
| 質量 (Quality) | 60 | 航空運輸業優勢。 |
| 成長 (Growth) | 65 | 客運量增強動能。 |
| 波動性 (Volatility) | 60 | 低波動。 |
| 情緒 (Sentiment) | 55 | 散戶持有較多。 |
| 宏觀 (Macro) | 60 | 跨境旅遊持續。 |

**投資評級：【中性偏多】**

- **建議**：適合波段持有。` },
    { symbol: '2613', score: 62, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 50 | 技術面轉弱。 |
| 估值 (Valuation) | 65 | 低基期。 |
| 質量 (Quality) | 55 | 散裝業務回穩。 |
| 成長 (Growth) | 50 | 動能不足。 |
| 波動性 (Volatility) | 60 | 穩定。 |
| 情緒 (Sentiment) | 55 | 觀望為主。 |
| 宏觀 (Macro) | 60 | 煤炭鐵礦石運輸。 |

**投資評級：【中性】**

- **分析**：股性偏冷。` },
    { symbol: '2633', score: 82, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 穩定攀升。 |
| 估值 (Valuation) | 85 | 防禦性首選。 |
| 質量 (Quality) | 95 | 獨佔權，現金流極佳。 |
| 成長 (Growth) | 45 | 緩慢成長。 |
| 波動性 (Volatility) | 98 | 全市場最高穩健。 |
| 情情緒 (Sentiment) | 70 | 政府基金與保險資金重鎮。 |
| 宏觀 (Macro) | 95 | 基礎建設龍頭。 |

**投資評級：【強力買入 (長期)】**

- **建議**：適合不喜波動的長線持股者（定存替代）。` },
    { symbol: '2634', score: 84, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 軍工題材轉熱。 |
| 估值 (Valuation) | 60 | 訂單能見度高。 |
| 質量 (Quality) | 85 | 航太維修龍頭。 |
| 成長 (Growth) | 88 | 受惠 F-16 維修中心與波音訂單。 |
| 波動性 (Volatility) | 65 | 股性偏強。 |
| 情緒 (Sentiment) | 82 | 主力買超顯著。 |
| 宏觀 (Macro) | 90 | 國防自主化。 |

**投資評級：【強力買入】**

- **亮點**：具備軍工與民航復甦雙引擎。` },
    { symbol: '2637', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | 散裝運費指數回升。 |
| 估值 (Valuation) | 65 | 配股配息大方。 |
| 質量 (Quality) | 70 | 船齡年輕，成本控制好。 |
| 成長 (Growth) | 60 | 運費波動敏感度高。 |
| 波動性 (Volatility) | 55 | 散裝常態。 |
| 情情緒 (Sentiment) | 65 | 法人青睞。 |
| 宏觀 (Macro) | 65 | 大宗商品貿易。 |

**投資評級：【買入】**

- **評語**：散裝優質生。` },
    { symbol: '2812', score: 68, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 50 | 指標中性。 |
| 估值 (Valuation) | 75 | 現金股利預期。 |
| 質量 (Quality) | 70 | 呆帳低，體質穩。 |
| 成長 (Growth) | 55 | 獲利平穩發展。 |
| 波動性 (Volatility) | 85 | 銀行股穩健特徵。 |
| 情情緒 (Sentiment) | 60 | 股東人數增加。 |
| 宏觀 (Macro) | 70 | 升息循環。 |

**投資評級：【中性偏多】**

- **分析**：獲利穩健的地區性銀行。` },
    { symbol: '2834', score: 70, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 緩步填息。 |
| 估值 (Valuation) | 80 | 股價基期極低。 |
| 質量 (Quality) | 65 | 公股背景穩健。 |
| 成長 (Growth) | 60 | 中小企業貸款成長。 |
| 波動性 (Volatility) | 90 | 極度平穩。 |
| 情緒 (Sentiment) | 65 | 定存族首選。 |
| 宏觀 (Macro) | 75 | 政策金融穩定。 |

**投資評級：【買入】**

- **分析**：公股銀行中的高 CP 選擇。` },
    { symbol: '2851', score: 72, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 再保市場利費提升。 |
| 估值 (Valuation) | 75 | 低 PB。 |
| 質量 (Quality) | 70 | 投資收益回穩。 |
| 成長 (Growth) | 65 | 營運修復。 |
| 波動性 (Volatility) | 80 | 防守指標。 |
| 情情緒 (Sentiment) | 60 | 籌碼穩定。 |
| 宏觀 (Macro) | 70 | 全球再保險緊縮。 |

**投資評級：【買入】**

- **分析**：利基型金融股。` },
    { symbol: '2867', score: 55, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 45 | 技術面整理。 |
| 估值 (Valuation) | 60 | 壽險業挑戰多。 |
| 質量 (Quality) | 50 | 資產重分類影響。 |
| 成長 (Growth) | 55 | 保費收入持平。 |
| 波動性 (Volatility) | 60 | 較同業高。 |
| 情情緒 (Sentiment) | 50 | 信心不足。 |
| 宏觀 (Macro) | 60 | 利率環境。 |

**投資評級：【中性】**

- **分析**：觀望壽險業利差改善。` },
    { symbol: '1102', score: 75, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 底部區醞釀反彈。 |
| 估值 (Valuation) | 80 | 殖利率與資產價值高。 |
| 質量 (Quality) | 70 | 亞洲最具規模水泥廠。 |
| 成長 (Growth) | 65 | 中國基建回升預期。 |
| 波動性 (Volatility) | 80 | 成熟產業穩健。 |
| 情緒 (Sentiment) | 65 | 大戶持股高。 |
| 宏觀 (Macro) | 70 | ESG 綠色轉型。 |

**投資評級：【買入】**

- **分析**：水泥雙雄中的優質生，具備穩健回收期。` }
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
        console.log('✅ Batch 5 (Part 3) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
