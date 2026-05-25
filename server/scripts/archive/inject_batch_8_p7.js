const { pool } = require('../db');

const reports = [
    { symbol: '4916', score: 69, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 股價短線放量轉強，突破盤整區間。 |
| 估值 (Valuation) | 55 | 評價中規中矩，反映工控產業平均。 |
| 質量 (Quality) | 65 | 專注博弈與國防 IPC，毛利率具備領先優勢。 |
| 成長 (Growth) | 70 | 受惠美系國防客戶訂單與航太市場復甦。 |
| 波動性 (Volatility) | 50 | 股性較為活潑，成交量波動大。 |
| 情情緒 (Sentiment) | 75 | 市場對防禦性概念股關注度回升。 |
| 宏觀 (Macro) | 80 | 全球軍備支出增加之長期紅利。 |

**投資評級：【買入】**

- **建議**：事欣科具備特定產業紅利，適合追求波段轉強之標的。` },
    { symbol: '2457', score: 71, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 60 | 指標處於低檔黃金交叉初步階段。 |
| 估值 (Valuation) | 75 | 位階相對安全，具備長線保護力。 |
| 質量 (Quality) | 65 | 充電樁硬體技術領先，轉型效益顯現中。 |
| 成長 (Growth) | 75 | 期待 2026 全球 EV 充電基礎建設之爆發。 |
| 波動性 (Volatility) | 70 | 底部區間橫盤。 |
| 情情緒 (Sentiment) | 65 | 法人操作偏向保守中性，等待數據證實。 |
| 宏觀 (Macro) | 85 | 全球能源轉型與新能源車滲透率提升。 |

**投資評級：【買入】**

- **分析**：飛宏具備充電樁黑馬資質，適合於位階調整期進行長線配置。` },
    { symbol: '2402', score: 74, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 股價轉強站上關鍵均線，多頭表態明顯。 |
| 估值 (Valuation) | 65 | 反映其車用軟板之產業地位溢價。 |
| 質量 (Quality) | 75 | 產品組合優化，毛利率逐季改善中。 |
| 成長 (Growth) | 80 | 2月營收年增 11%，馬來西亞廠投產後具動能。 |
| 波動性 (Volatility) | 75 | 股價盤整後上。 |
| 情情緒 (Sentiment) | 70 | 法人進場卡位，籌碼轉趨集中。 |
| 宏觀 (Macro) | 80 | 智能座艙與車用電子之長期趨勢受益者。 |

**投資評級：【強力買入】**

- **建議**：毅嘉受惠營收超預期與全球產能佈局，營運具高度透明度。` },
    { symbol: '2201', score: 77, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 65 | 股價盤整待變，守穩長期大底。 |
| 估值 (Valuation) | 95 | PB 僅 0.48，重置價值遠高於目前市值。 |
| 質量 (Quality) | 70 | 品牌轉型與資產開發雙引擎驅動。 |
| 成長 (Growth) | 65 | n7 車款放量與裕隆城入帳貢獻。 |
| 波動性 (Volatility) | 85 | 市場波動時展現極強韌性。 |
| 情情緒 (Sentiment) | 75 | 價值派投資人與大戶長期駐紮。 |
| 宏觀 (Macro) | 75 | 受惠台灣車市穩定與電動車替代浪潮。 |

**投資評級：【強力買入】**

- **分析**：裕隆具備深厚資產價值，目前評價極度委屈，為防禦之選。` },
    { symbol: '3709', score: 73, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 90 | 出現強烈追價，突破長期反轉平台。 |
| 估值 (Valuation) | 75 | PE 低於 10 倍，低價高獲利特性显著。 |
| 質量 (Quality) | 65 | 通路營運效率穩定，財務結構健全。 |
| 成長 (Growth) | 70 | 遠程辦公與伺服器通路之持續性需求。 |
| 波動性 (Volatility) | 60 | 波動率逐步擴大，適合短線進攻。 |
| 情情緒 (Sentiment) | 70 | 市場熱錢尋找低價高業績標的。 |
| 宏觀 (Macro) | 70 | 受惠 IT 產業設備更新與替換。 |

**投資評級：【買入】**

- **建議**：鑫聯大具備強勢補漲條件，低 PE 加上高動量適合短分操作。` }
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
        console.log('✅ Batch 8 (Part 7) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
