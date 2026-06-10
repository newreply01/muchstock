const { query } = require('./db');

async function checkIndustry() {
  try {
    const res = await query(`
      SELECT industry, COUNT(*) 
      FROM stocks 
      WHERE symbol !~ '[A-Za-z]' 
        AND (industry IS NULL OR industry NOT LIKE '%權證%')
        AND (name NOT LIKE '%認購%')
        AND (name NOT LIKE '%認售%')
        AND (name NOT LIKE '%牛證%')
        AND (name NOT LIKE '%熊證%')
      GROUP BY industry 
      ORDER BY count DESC 
      LIMIT 20
    `);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkIndustry();
