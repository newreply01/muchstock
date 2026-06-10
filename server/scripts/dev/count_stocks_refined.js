const { query } = require('./db');
require('dotenv').config();

async function refinedCount() {
  try {
    // 過濾掉明顯是權證的 (含英文字母，或是 name 包含 購/售/牛/熊，或是 industry 包含權證)
    const res = await query(`
      SELECT symbol, name, market, industry 
      FROM stocks 
      WHERE symbol !~ '[A-Za-z]' 
        AND (industry IS NULL OR industry NOT LIKE '%權證%')
        AND (name NOT LIKE '%認購%')
        AND (name NOT LIKE '%認售%')
        AND (name NOT LIKE '%牛證%')
        AND (name NOT LIKE '%熊證%')
    `);
    
    let normalStocks = 0;
    let etfs = 0;
    
    for (const row of res.rows) {
      if (row.symbol.startsWith('00') && row.symbol.length <= 6) {
        etfs++;
      } else if (row.industry === 'ETF' || row.industry === '上櫃ETF') {
        etfs++;
      } else {
        // Assume rest are normal stocks
        normalStocks++;
      }
    }
    
    console.log(`總筆數: ${res.rows.length}`);
    console.log(`個股數量 (估計): ${normalStocks}`);
    console.log(`ETF 數量 (估計): ${etfs}`);
    
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

refinedCount();
