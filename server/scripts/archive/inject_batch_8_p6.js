const { pool } = require('../db');

const reports = [
    { symbol: '5608', score: 64, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 55 | 股價低檔橫盤，成交量尚未明顯釋放。 |
| 估值 (Valuation) | 85 | PB 僅 0.68，清算價值高於目前股價。 |
| 質量 (Quality) | 60 | 船隊結構調整中，獲利能力隨運價波動。 |
| 成長 (Growth) | 50 | 營收隨 BDI 指數起伏，短期動能普普。 |
| 波動性 (Volatility) | 80 | 防禦性價值凸顯。 |
| 情緒 (Sentiment) | 60 | 市場關注度較低，適合大戶低吸。 |
| 宏觀 (Macro) | 65 | 散裝航線受紅海與荷姆茲海峽局勢間接影響。 |

**投資評級：【中性偏多】**

- **建議**：適合追求極致低 PB 的價值派投資者，持有等待運價反轉契機。` },
    { symbol: '2616', score: 78, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 95 | 強勢噴出大漲，創下近期新高。 |
| 估值 (Valuation) | 45 | 現階段反映避險與能源溢價。 |
| 質量 (Quality) | 70 | 油氣零售與物流基盤穩固，現金流強。 |
| 成長 (Growth) | 75 | 加油站站點擴張與能源價格上漲紅利。 |
| 波動性 (Volatility) | 50 | 股性隨地緣政治新聞劇烈起伏。 |
| 情情緒 (Sentiment) | 85 | 戰爭避險資金與能源套利資金積極。 |
| 宏觀 (Macro) | 80 | 荷姆茲海峽封鎖風險升高，推升能源股。 |

**投資評級：【強力買入】**

- **分析**：山隆具備能源通路稀缺性，地緣政治緊張時期為資金重要避風港。` },
    { symbol: '1513', score: 86, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 80 | 回測季線守穩，法人認同度重返高峰。 |
| 估值 (Valuation) | 55 | 高 PB 雖是壓力，但被高成長獲利所化解。 |
| 質量 (Quality) | 90 | GIS 設備具備高毛利與高度技術門檻。 |
| 成長 (Growth) | 90 | 接單量創歷史新高，訂單能見度至 2027。 |
| 波動性 (Volatility) | 65 | 指標重電股，波動與權值股同步。 |
| 情情緒 (Sentiment) | 90 | 法人集中度高，FactSet 目標價上調至 190+。 |
| 宏觀 (Macro) | 95 | 淨零佈局與強韌電網政策之絕對受益者。 |

**投資評級：【強力買入】**

- **評語**：中興電為能源轉型概念股之核心，具備強大競爭優勢，長線首選。` },
    { symbol: '3048', score: 69, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 70 | 股價逐步站回年線，指標翻揚。 |
| 估值 (Valuation) | 60 | PE 處於中位數，估值反映復甦預期。 |
| 質量 (Quality) | 65 | 電子通路業競爭激烈，毛利控制穩健。 |
| 成長 (Growth) | 70 | 受惠 5G 及物聯網應用之晶片代理拉貨。 |
| 波動性 (Volatility) | 75 | 位階不高，下檔有撐。 |
| 情情緒 (Sentiment) | 70 | 資金回流電子通路及零組件族群。 |
| 宏觀 (Macro) | 75 | 期待全球消費性電子年底旺季提前拉貨。 |

**投資評級：【買入】**

- **建議**：益登適合追求平穩走勢與電子業復甦紅利的穩健型標的。` },
    { symbol: '3023', score: 82, report: `
| 維度 | 得分 (0-100) | 簡評 |
| :--- | :--- | :--- |
| 動量 (Momentum) | 85 | 多頭格局啟動，RSI 強勢進入 60 以上區域。 |
| 估值 (Valuation) | 50 | 評價略高於產業平均，反映其高質量。 |
| 質量 (Quality) | 95 | 客製化能力極強，毛利率連年維持高水準。 |
| 成長 (Growth) | 85 | 醫療、綠能與 EV 精密線材出貨強勁。 |
| 波動性 (Volatility) | 70 | 績優股特有的穩健上升趨勢。 |
| 情情緒 (Sentiment) | 85 | 長線基金必備標的，籌碼極度穩定。 |
| 宏觀 (Macro) | 90 | 受惠自動化與綠能零組件之全球需求。 |

**投資評級：【強力買入】**

- **分析**：信邦透過利基型產品維持高獲利，為零組件界之勞斯萊斯，價值極高。` }
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
        console.log('✅ Batch 8 (Part 6) Injection Complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
