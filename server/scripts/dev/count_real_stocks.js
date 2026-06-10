const { query } = require('./db');
require('dotenv').config();

async function getPreciseCount() {
  try {
    // 普通股: 剛好 4 碼數字
    const stocksRes = await query(`
      SELECT COUNT(*) as count 
      FROM stocks 
      WHERE symbol ~ '^\\d{4}$'
    `);
    
    // ETF: 剛好 6 碼數字且開頭為 '00'
    const etfsRes = await query(`
      SELECT COUNT(*) as count 
      FROM stocks 
      WHERE symbol ~ '^00\\d{4}$'
    `);
    
    // 或者其他 4 碼以上的上市櫃股票(如果有例外)
    const totalRes = await query(`
      SELECT COUNT(*) as count 
      FROM stocks 
      WHERE symbol ~ '^\\d{4}$' OR symbol ~ '^00\\d{4}$'
    `);

    console.log(`普通股 (4碼數字): ${stocksRes.rows[0].count} 檔`);
    console.log(`ETF (6碼數字，00開頭): ${etfsRes.rows[0].count} 檔`);
    console.log(`\n正確的 AI 生成總檔數應為: ${totalRes.rows[0].count} 檔`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

getPreciseCount();
