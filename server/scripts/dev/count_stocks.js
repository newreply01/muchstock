const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { query } = require('./db');

async function countStocksAndETFs() {
  try {
    // 取得所有股票
    const res = await query('SELECT symbol FROM stocks;');
    const symbols = res.rows.map(r => r.symbol);
    
    // 判斷邏輯：
    // - 台灣普通股 (個股) 通常是 4 碼數字 (例如 2330, 0050 也算普通股或ETF)
    // - ETF 可能是 4 碼到 6 碼數字 (例如 0050, 00929)
    // - 權證通常是 6 碼數字加上 1 碼英文字母 (例如 03021U)
    
    let stockCount = 0;
    let etfCount = 0;
    
    // 過濾出我們要的標的
    const targetSymbols = symbols.filter(symbol => {
      // 排除權證 (通常包含英文字母)
      if (/[A-Za-z]/.test(symbol)) {
        return false;
      }
      return true;
    });

    for (const symbol of targetSymbols) {
        if (symbol.startsWith('00') && symbol.length >= 4) {
             etfCount++;
        } else {
             stockCount++; // 大多數普通股為4碼數字
        }
    }

    console.log(`總代號數量: ${symbols.length}`);
    console.log(`排除含有英文字母(權證及特別股等)後的數量: ${targetSymbols.length}`);
    console.log(`個股數量 (估計): ${stockCount}`);
    console.log(`ETF 數量 (開頭00, 估計): ${etfCount}`);
    
    // 另外一種分類方式 (如果有 market_type, sector_item 等欄位)
    const typeRes = await query(`
        SELECT 
            SUM(CASE WHEN symbol NOT LIKE '%[A-Za-z]%' AND NOT symbol LIKE '00%' THEN 1 ELSE 0 END) as calculated_stocks,
            SUM(CASE WHEN symbol LIKE '00%' AND symbol NOT LIKE '%[A-Za-z]%' THEN 1 ELSE 0 END) as calculated_etfs
        FROM stocks
        WHERE symbol !~ '[A-Za-z]';
    `);
    
    console.log(`資料庫直接計算: \n - 個股 (不含英文字、非00開頭): ${typeRes.rows[0].calculated_stocks} \n - ETF (00開頭、不含英文字): ${typeRes.rows[0].calculated_etfs}`);
    
    // 計算預計要生成的總數
    console.log(`\n需要生成AI報告的總數: ${targetSymbols.length}`);
    
  } catch(err) {
      console.error(err);
  } finally {
      process.exit(0);
  }
}

countStocksAndETFs();
