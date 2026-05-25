const { Pool } = require('pg');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: 'localhost',
  database: 'stock_screener',
  password: process.env.DB_PASSWORD || 'postgres123',
  port: parseInt(process.env.DB_PORT || '5533'),
});

const dumpPath = '/home/xg/stock-screener/refined_slim_v2.sql';

async function run() {
  try {
    const dbName = process.env.DB_NAME || 'stock_screener';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASSWORD || 'postgres123';
    const dbPort = process.env.DB_PORT || '5533';

    console.log('🚀 [Slim-Flatten-SQL] 開始產生雲端平面化 SQL 備份...');

    // 1. 取得最新交易日
    const latestTickerDayRes = await pool.query("SELECT MAX(trade_time) as last_time FROM realtime_ticks");
    const lastTime = latestTickerDayRes.rows[0].last_time;
    let lastDayStr = null;
    if (lastTime) {
        const tpeDate = new Date(new Date(lastTime).getTime() + 8 * 3600 * 1000);
        lastDayStr = tpeDate.toISOString().split('T')[0];
    }
    console.log(`📅 最新交易日: ${lastDayStr}`);

    // 2. 建立純淨 Schema 
    console.log('🏗️  正在導出平面化表結構...');
    
    // 這裡只列出母表，我們將在 Supabase 上將它們轉化為一般表
    const targetTables = [
        'users', 'stocks', 'ai_prompt_templates', 'stock_health_scores', 
        'ai_reports', 'daily_prices', 'fundamentals', 
        'fm_total_institutional', 'fm_total_margin', 'realtime_ticks',
        'fm_margin_trading', 'institutional'
    ];

    let dropHeader = "-- Cloud-Flatten SQL Dump\n\n";
    targetTables.forEach(table => {
        dropHeader += `DROP TABLE IF EXISTS public.${table} CASCADE;\n`;
    });
    dropHeader += '\n-- Enable required extensions\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;\n\n';
    
    fs.writeFileSync(dumpPath, dropHeader);
    
    // 導出 Schema (精確匹配母表)
    const tempSchema = '/tmp/raw_schema.sql';
    const tableFlags = targetTables.map(t => `-t "${t}"`).join(' ');
    execSync(`PGPASSWORD='${dbPass}' pg_dump -h localhost -p ${dbPort} -U ${dbUser} -d ${dbName} --schema-only --no-owner --no-privileges --no-comments ${tableFlags} > ${tempSchema}`);
    
    let cleanSchema = fs.readFileSync(tempSchema, 'utf8');

    // 【重要：平面化邏輯】移除 PARTITION BY 語句，將其轉化為普通表
    console.log('🔧 正在消除 SQL 中的分割表定義 (Flattening)...');
    cleanSchema = cleanSchema.replace(/PARTITION BY RANGE\s*\([^)]+\)/gi, '');
    
    // 移除 pg_dump 生成的系統參數
    const schemaLines = cleanSchema.split('\n').filter(line => !line.match(/^(SET|SELECT pg_catalog|\\)/));
    
    // 修正 uuid_generate_v4() 前綴
    let finalSchema = schemaLines.join('\n').replace(/public\.uuid_generate_v4\(\)/g, 'uuid_generate_v4()');
    
    fs.appendFileSync(dumpPath, finalSchema);
    fs.unlinkSync(tempSchema);

    // 3. 數據導出
    const appendTableData = async (tableName, columns, queryStr) => {
        console.log(`📦 正在導出 ${tableName} 數據...`);
        const tmpFile = `/tmp/data_${tableName}.tmp`;
        const copyCmd = `PGPASSWORD='${dbPass}' psql -h localhost -p ${dbPort} -U ${dbUser} -d ${dbName} -c "COPY (${queryStr}) TO STDOUT" > ${tmpFile}`;
        execSync(copyCmd);
        
        fs.appendFileSync(dumpPath, `\n\n-- Data for ${tableName}\nCOPY public.${tableName} (${columns}) FROM stdin;\n`);
        const data = fs.readFileSync(tmpFile);
        fs.appendFileSync(dumpPath, data);
        fs.appendFileSync(dumpPath, "\\.\n");
        fs.unlinkSync(tmpFile);
    };

    const symbolFilter = "(symbol ~ '^\\d{4}$' OR symbol ~ '^00.*')";
    const stockIdFilter = "(stock_id ~ '^\\d{4}$' OR stock_id ~ '^00.*')";
    
    const periods = [
        { name: '2024', filter: "BETWEEN '2024-01-01' AND '2024-12-31'" },
        { name: '2025', filter: "BETWEEN '2025-01-01' AND '2025-12-31'" },
        { name: '2026', filter: ">= '2026-01-01'" }
    ];

    await appendTableData('users', 'id, email, password_hash, name, avatar_url, provider, provider_id, created_at, updated_at', 'SELECT id, email, password_hash, name, avatar_url, provider, provider_id, created_at, updated_at FROM users');
    await appendTableData('stocks', 'symbol, name, market, industry, updated_at, stock_type, listing_date', `SELECT symbol, name, market, industry, updated_at, stock_type, listing_date FROM stocks WHERE ${symbolFilter}`);
    await appendTableData('ai_prompt_templates', 'id, name, content, version, is_active, created_at, note', 'SELECT id, name, content, version, is_active, created_at, note FROM ai_prompt_templates');
    await appendTableData('stock_health_scores', 'id, symbol, name, industry, market, close_price, change_percent, overall_score, grade, grade_color, profit_score, growth_score, safety_score, value_score, dividend_score, chip_score, pe, pb, dividend_yield, roe, gross_margin, revenue_growth, eps_growth, avg_cash_dividend, inst_net_buy, calc_date, created_at, smart_score, smart_rating', `SELECT id, symbol, name, industry, market, close_price, change_percent, overall_score, grade, grade_color, profit_score, growth_score, safety_score, value_score, dividend_score, chip_score, pe, pb, dividend_yield, roe, gross_margin, revenue_growth, eps_growth, avg_cash_dividend, inst_net_buy, calc_date, created_at, smart_score, smart_rating FROM stock_health_scores WHERE symbol IN (SELECT symbol FROM stocks WHERE ${symbolFilter})`);
    await appendTableData('ai_reports', 'symbol, content, sentiment_score, created_at, updated_at, report_date', `SELECT ar.symbol, ar.content, ar.sentiment_score, ar.created_at, ar.updated_at, ar.report_date FROM ai_reports ar JOIN stocks s ON ar.symbol = s.symbol WHERE (ar.symbol ~ '^\\d{4}$' OR ar.symbol ~ '^00.*') AND ar.report_date = (SELECT MAX(report_date) FROM ai_reports WHERE symbol = ar.symbol)`);
    
    // 合併匯出 daily_prices 到主表 (分段導出以防超時) - 使用主表(Parent)查詢
    for (const p of periods) {
        await appendTableData('daily_prices', 'id, symbol, trade_date, open_price, high_price, low_price, close_price, change_amount, change_percent, volume, trade_value, transactions, created_at, pe, pb, dividend_yield', `SELECT id, symbol, trade_date, open_price, high_price, low_price, close_price, change_amount, change_percent, volume, trade_value, transactions, created_at, pe, pb, dividend_yield FROM daily_prices WHERE trade_date ${p.filter} AND ${symbolFilter}`);
    }

    // 合併匯出 fundamentals
    for (const p of periods) {
        await appendTableData('fundamentals', 'id, symbol, trade_date, pe_ratio, dividend_yield, pb_ratio, created_at', `SELECT id, symbol, trade_date, pe_ratio, dividend_yield, pb_ratio, created_at FROM fundamentals WHERE trade_date ${p.filter} AND ${symbolFilter}`);
    }

    await appendTableData('fm_total_institutional', 'date, name, buy, sell', "SELECT date, name, buy, sell FROM fm_total_institutional WHERE date >= CURRENT_DATE - INTERVAL '2.5 years'");
    await appendTableData('fm_total_margin', 'date, name, margin_purchase_buy, margin_purchase_sell, margin_purchase_cash_repayment, margin_purchase_yesterday_balance, margin_purchase_today_balance, short_sale_buy, short_sale_sell, short_sale_cash_repayment, short_sale_yesterday_balance, short_sale_today_balance', "SELECT date, name, margin_purchase_buy, margin_purchase_sell, margin_purchase_cash_repayment, margin_purchase_yesterday_balance, margin_purchase_today_balance, short_sale_buy, short_sale_sell, short_sale_cash_repayment, short_sale_yesterday_balance, short_sale_today_balance FROM fm_total_margin WHERE date >= CURRENT_DATE - INTERVAL '2.5 years'");

    // 合併匯出 fm_margin_trading
    for (const p of periods) {
        await appendTableData('fm_margin_trading', 'date, stock_id, margin_purchase_buy, margin_purchase_sell, margin_purchase_cash_repayment, margin_purchase_yesterday_balance, margin_purchase_today_balance, short_sale_buy, short_sale_sell, short_sale_cash_repayment, short_sale_yesterday_balance, short_sale_today_balance', `SELECT date, stock_id, margin_purchase_buy, margin_purchase_sell, margin_purchase_cash_repayment, margin_purchase_yesterday_balance, margin_purchase_today_balance, short_sale_buy, short_sale_sell, short_sale_cash_repayment, short_sale_yesterday_balance, short_sale_today_balance FROM fm_margin_trading WHERE date ${p.filter} AND ${stockIdFilter}`);
    }

    // 合併匯出 institutional 到主表 (原本在子表的分段資料現在統一注入 Supabase 的主表)
    for (const p of periods) {
        const year = p.name;
        const instTable = `institutional_${year}`;
        // 先检查表是否存在
        const checkRes = await pool.query(`SELECT 1 FROM pg_tables WHERE tablename = '${instTable}'`);
        if (checkRes.rowCount > 0) {
            await appendTableData('institutional', 'symbol, trade_date, foreign_buy, foreign_sell, foreign_net, trust_buy, trust_sell, trust_net, dealer_buy, dealer_sell, dealer_net', `SELECT symbol, trade_date, foreign_buy, foreign_sell, foreign_net, trust_buy, trust_sell, trust_net, dealer_buy, dealer_sell, dealer_net FROM ${instTable} WHERE ${symbolFilter}`);
        }
    }

    if (lastDayStr) {
        await appendTableData('realtime_ticks', 'id, symbol, trade_time, price, open_price, high_price, low_price, volume, trade_volume, buy_intensity, sell_intensity, five_levels, created_at, previous_close', `SELECT id, symbol, trade_time, price, open_price, high_price, low_price, volume, trade_volume, buy_intensity, sell_intensity, five_levels, created_at, previous_close FROM realtime_ticks WHERE DATE(trade_time) = '${lastDayStr}' AND ${symbolFilter}`);
    }

    console.log(`\n✅ 平面化備份完成: ${dumpPath}`);
    const stats = execSync(`ls -lh ${dumpPath}`).toString();
    console.log(stats);

  } catch (err) {
    console.error('❌ 發生錯誤:', err);
  } finally {
    await pool.end();
  }
}

run();
