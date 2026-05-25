const { Pool } = require('pg');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'stock_screener',
  password: process.env.DB_PASSWORD || 'postgres123',
  port: parseInt(process.env.DB_PORT || '5433'),
});

async function run() {
  try {
    console.log('--- 分析資料庫表大小 ---');
    const res = await pool.query(`
      SELECT relname, (relpages * 8 / 1024) as size_mb 
      FROM pg_class 
      JOIN pg_namespace n ON n.oid = pg_class.relnamespace
      WHERE relkind = 'r' AND n.nspname = 'public'
      ORDER BY relpages DESC 
      LIMIT 15
    `);
    
    console.table(res.rows);
    
    const includeTables = [
      'stocks',
      'ai_reports',
      'stock_health_scores',
      'ai_prompt_templates',
      // 'monthly_revenue', // Exclude for now to keep it really slim if needed
    ];
    
    console.log('將僅包含以下核心表項目:', includeTables.join(', '));

    const includeFlags = includeTables.map(t => `-t ${t}`).join(' ');
    const dbName = process.env.DB_NAME || 'stock_screener';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASSWORD || 'postgres123';
    const dbPort = process.env.DB_PORT || '5433';
    
    const dumpPath = '/home/xg/stock-screener/slim_db.sql';
    console.log(`--- 開始產生 ultra-slim & compatible 備份 ---`);
    
    const dumpCmd = `PGPASSWORD='${dbPass}' pg_dump -h localhost -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists --no-owner --no-privileges --inserts ${includeFlags} > ${dumpPath}`;
    console.log('執行指令:', dumpCmd);
    execSync(dumpCmd, { stdio: 'inherit' });
    
    console.log(`備份完成: ${dumpPath}`);
    const stats = execSync(`ls -lh ${dumpPath}`).toString();
    console.log(stats);

  } catch (err) {
    console.error('發生錯誤:', err);
  } finally {
    await pool.end();
  }
}

run();
