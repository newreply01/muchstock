const { pool } = require('../db');

const reports = [
    { symbol: '2388', score: 76, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 75 | 股價盤整後站回五日線，強勢轉正。 |
| 估值 (Valuation) | 25 | PE 高達 400+，顯示市場對其高成長之極大期待。 |
| 質量 (Quality) | 70 | 專注 AI 加速器與嵌入式系統，技術力深厚。 |
| 成長 (Growth) | 90 | 1月營收表現出色，AI 相關專案挹注明顯。 |
| 波動性 (Volatility) | 50 | 典型的 AI 飆股，震盪幅度大，操作需謹慎。 |
| 情緒 (Sentiment) | 85 | 市場對老牌晶片股轉型 AI 具備高度認同。 |
| 宏觀 (Macro) | 90 | 全球 Edge AI 與自主運算之長線受益者。 |

**投資評級：【強力買入】**

- **建議**：威盛具備獨特的技術壁壘，適合追求 AI 題材爆發性的投資人。` },
    { symbol: '3031', score: 68, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 三連紅突破短期下行趨勢線，買盤進場。 |
| 估值 (Valuation) | 85 | 殖利率達 4.6%，PB 僅 1.26，具備估值優勢。 |
| 質量 (Quality) | 65 | LED 市場競爭趨緩，獲利能力趨於回穩。 |
| 成長 (Growth) | 55 | 傳統 LED 成長平淡，需觀察車用佈局進度。 |
| 波動性 (Volatility) | 75 | 股價低位階，下檔風險有限。 |
| 情緒 (Sentiment) | 65 | 目前市場目光集中在半導體，LED 尚待吸金。 |
| 宏觀 (Macro) | 60 | 受惠基建需求與商用燈具換裝。 |

**投資評級：【買入】**

- **建議**：佰鴻適合尋求穩健股息與低位階補漲機會的存股族。` },
    { symbol: '4739', score: 84, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 95 | 出現帶量看漲吞沒型態，進入主升段。 |
| 估值 (Valuation) | 55 | 反映其鋰電材料龍頭地位之溢價。 |
| 質量 (Quality) | 75 | 硫酸鎳、硫酸鈷製程領先，毛利率優化。 |
| 成長 (Growth) | 95 | 2月營收年增 192%，營運規模極速擴散。 |
| 波動性 (Volatility) | 60 | 受大宗商品定價影響，波動較大。 |
| 情緒 (Sentiment) | 90 | 法人針對電池材料族群進行報復性補漲。 |
| 宏觀 (Macro) | 85 | 全球能源轉型與儲能市場需求不減。 |

**投資評級：【強力買入】**

- **分析**：康普營收爆發力冠絕化工業，為電池材料核心指標，強烈建議追蹤。` },
    { symbol: '5371', score: 65, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 季線下彎仍是壓力，初步出現止跌訊號。 |
| 估值 (Valuation) | 75 | PB 1.29 顯示資產價值支撐力強。 |
| 質量 (Quality) | 65 | 全球主要背光模組廠，具規模經濟優勢。 |
| 成長 (Growth) | 60 | 整體筆電市場持平，亮點在於高端顯示應用。 |
| 波動性 (Volatility) | 70 | 面板族群同步修正後進入築底。 |
| 情情緒 (Sentiment) | 60 | 法人買盤縮手，等待無人機事業實質獲利。 |
| 宏觀 (Macro) | 65 | 期待電子外銷訂單隨傳統旺季回歸。 |

**投資評級：【中性偏多】**

- **建議**：具備軍工無人機題材之安全標的，適合分批布局等待噴發。` },
    { symbol: '3042', score: 80, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 十日線黃金交叉月線，技術面極佳。 |
| 估值 (Valuation) | 70 | 殖利率 5% 搭配合理的 PE，堪稱優質標的。 |
| 質量 (Quality) | 85 | 全球石英元件老二，客戶涵蓋各大龍頭。 |
| 成長 (Growth) | 80 | 受惠 5G、WiFi 7 與衛星通訊對頻率導正之需求。 |
| 波動性 (Volatility) | 75 | 特有的週期成長股走勢，穩健中帶勁。 |
| 情情緒 (Sentiment) | 80 | 外資持續站在買方，對基本面投下信任票。 |
| 宏觀 (Macro) | 85 | 萬物互聯趨勢下，石英元件需求長流。 |

**投資評級：【強力買入】**

- **分析**：晶技具備極高質量與穩定現金流，為 AI 基礎設施不容忽視的一環。` }
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
        console.log('✅ Batch 8 (Part 9) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
