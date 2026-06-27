// Note: SSL verification is handled per-connection via rejectUnauthorized: false in poolConfig below
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 在 WSL/開發環境中，優先使用本地資料庫，除非明確設定 NODE_ENV=production 且沒有 localhost 轉發
const dbUrl = (process.env.NODE_ENV === 'production' && !(process.env.DB_HOST || '').includes('localhost')) 
    ? (process.env.DATABASE_URL || process.env.POSTGRES_URL)
    : null;

const host = process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost';
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// 辨識是否為本地或內網 IP
const isPrivateIP = (ip) => {
    if (!ip) return false;
    if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') return true;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    if (first === 10) return true; // 10.0.0.0/8
    if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12
    if (first === 192 && second === 168) return true; // 192.168.0.0/16
    return false;
};

// 如果有 dbUrl，我們透過 dbUrl 判斷是否為本地端
const isDbUrlLocal = dbUrl ? (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) : false;

let useSSL = isVercel || (dbUrl ? !isDbUrlLocal : !isPrivateIP(host));
if (process.env.DB_SSL === 'true') useSSL = true;
if (process.env.DB_SSL === 'false') useSSL = false;

const poolConfig = dbUrl ? {
    connectionString: dbUrl,
} : {
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    host: host,
    database: process.env.POSTGRES_DATABASE || process.env.DB_NAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
};

// 統一補上通用設定 (SSL 與效能)
Object.assign(poolConfig, {
    ssl: useSSL ? { 
        require: true,
        rejectUnauthorized: false 
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

const pool = new Pool(poolConfig);

// 全域禁用 TLS 已移除，確保 Node.js 其他 HTTPS 請求安全性
// if (useSSL) {
//     process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// }

// 強制資料庫連線會話時區為台北時間
pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'Asia/Taipei'");
});

// 慢查詢閾值 (毫秒)，可透過環境變數調整
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_MS || '500', 10);

const query = async (text, params) => {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration >= SLOW_QUERY_MS) {
        const preview = text.replace(/\s+/g, ' ').substring(0, 120);
        console.warn(`[SLOW QUERY] ${duration}ms | rows=${result.rowCount} | ${preview}`);
    }
    return result;
};

const end = () => pool.end();
const initDatabase = async () => {};

const executeBatch = async (tableName, columns, rowsData, conflictClause = '') => {
    if (!rowsData || rowsData.length === 0) return { rowCount: 0 };
    
    // Calculate number of columns
    const colCount = columns.length;
    
    // Chunk size to prevent exceeding 65535 parameter limit in Postgres
    // Max params / colCount
    const maxRowsPerBatch = Math.floor(60000 / colCount);
    let totalInserted = 0;

    for (let i = 0; i < rowsData.length; i += maxRowsPerBatch) {
        const chunk = rowsData.slice(i, i + maxRowsPerBatch);
        
        let params = [];
        let valueStrings = [];
        
        let paramIndex = 1;
        for (const row of chunk) {
            let rowValueStr = [];
            for (const val of row) {
                params.push(val);
                rowValueStr.push(`$${paramIndex}`);
                paramIndex++;
            }
            valueStrings.push(`(${rowValueStr.join(', ')})`);
        }
        
        const sql = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES ${valueStrings.join(', ')}
            ${conflictClause}
        `;
        
        const result = await query(sql, params);
        totalInserted += (result.rowCount || 0);
    }
    
    return { rowCount: totalInserted };
};

module.exports = { pool, query, executeBatch, end, initDatabase };
