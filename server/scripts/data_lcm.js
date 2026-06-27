const { query, pool, end } = require('../db');
const { getTaiwanDate, getTaiwanDateString } = require('../utils/timeUtils');

/**
 * Data Life Cycle Manager (Data LCM)
 * 負責維護資料庫分割表、執行資料降階（Downsampling）與清理舊資料。
 */

async function createRealtimePartitions() {
    console.log('[LCM] 正在檢查並建立 realtime_ticks 分割表...');
    
    // 建立未來 7 天的分區
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        
        // 取得台灣時間的 YYYYMMDD
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }).replace(/-/g, '');
        const tableName = `realtime_ticks_${dateStr}`;
        
        const start = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const fromStr = start.toISOString();
        const toStr = end.toISOString();

        try {
            const checkRes = await query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
                [tableName]
            );

            if (!checkRes.rows[0].exists) {
                console.log(`[LCM] 建立分區 ${tableName} (${fromStr} ~ ${toStr})`);
                await query(`
                    CREATE TABLE ${tableName} PARTITION OF realtime_ticks
                    FOR VALUES FROM ('${fromStr}') TO ('${toStr}')
                `);
            }
        } catch (err) {
            console.error(`[LCM] 建立分區 ${tableName} 失敗:`, err.message);
        }
    }

    // 建立 realtime_ticks_history 分區 (本月與下個月)
    for (let i = 0; i < 2; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const tableName = `realtime_ticks_history_${year}_${month}`;
        
        const nextMonth = new Date(year, d.getMonth() + 1, 1);
        const nextYear = nextMonth.getFullYear();
        const nextMonthStr = String(nextMonth.getMonth() + 1).padStart(2, '0');
        
        const fromStr = `${year}-${month}-01 00:00:00+08`;
        const toStr = `${nextYear}-${nextMonthStr}-01 00:00:00+08`;

        try {
            const checkRes = await query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
                [tableName]
            );

            if (!checkRes.rows[0].exists) {
                console.log(`[LCM] 建立歷史表分區 ${tableName} (${fromStr} ~ ${toStr})`);
                await query(`
                    CREATE TABLE ${tableName} PARTITION OF realtime_ticks_history
                    FOR VALUES FROM ('${fromStr}') TO ('${toStr}')
                `);
                
                // 嘗試建立主鍵 (以防萬一繼承失敗)
                try {
                    await query(`ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_pkey PRIMARY KEY (symbol, trade_time)`);
                } catch (pkErr) {
                    // Ignore if already exists or inherited
                }
            }
        } catch (err) {
            console.error(`[LCM] 建立歷史表分區 ${tableName} 失敗:`, err.message);
        }
    }
}

async function downsampleToMinuteK() {
    console.log('[LCM] 正在執行資料降階 (realtime_ticks -> daily_prices_1m)...');
    
    // 確保 1 分 K 表存在
    await query(`
        CREATE TABLE IF NOT EXISTS daily_prices_1m (
            symbol VARCHAR(20) NOT NULL,
            trade_time TIMESTAMPTZ NOT NULL,
            open NUMERIC,
            high NUMERIC,
            low NUMERIC,
            close NUMERIC,
            volume BIGINT,
            amount NUMERIC,
            PRIMARY KEY (symbol, trade_time)
        )
    `);

    // 彙總 7 天前的資料
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString();

    console.log(`[LCM] 彙總 ${cutoffStr} 之前的資料...`);
    
    const aggSql = `
        INSERT INTO daily_prices_1m (symbol, trade_time, open, high, low, close, volume, amount)
        SELECT 
            symbol, 
            date_trunc('minute', trade_time) as trade_time,
            (array_agg(price ORDER BY trade_time ASC))[1] as open,
            MAX(price) as high,
            MIN(price) as low,
            (array_agg(price ORDER BY trade_time DESC))[1] as close,
            SUM(trade_volume) as volume,
            SUM(price * trade_volume) as amount
        FROM realtime_ticks
        WHERE trade_time < $1
        GROUP BY symbol, date_trunc('minute', trade_time)
        ON CONFLICT (symbol, trade_time) DO NOTHING
    `;

    try {
        const res = await query(aggSql, [cutoffStr]);
        console.log(`[LCM] 彙總完成，新增/更新 ${res.rowCount} 筆 1分K 資料。`);
    } catch (err) {
        console.error('[LCM] 彙總失敗:', err.message);
    }
}

async function cleanupOldPartitions() {
    console.log('[LCM] 正在清理舊的分割表與備份資料...');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14); // 保留 14 天的明細，超過則刪除分區（前提是已降階）
    const cutoffDateStr = cutoff.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }).replace(/-/g, '');

    try {
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'realtime_ticks_20%' 
            AND table_name != 'realtime_ticks_old'
        `);

        for (const row of res.rows) {
            const tableName = row.table_name;
            const dateStr = tableName.replace('realtime_ticks_', '');
            if (dateStr < cutoffDateStr) {
                console.log(`[LCM] 刪除過期分區 ${tableName}`);
                await query(`DROP TABLE ${tableName}`);
            }
        }
    } catch (err) {
        console.error('[LCM] 清理分區失敗:', err.message);
    }

    // 清理 fm_* 備份表 (30天前)
    const fmCutoff = new Date();
    fmCutoff.setDate(fmCutoff.getDate() - 30);
    const fmCutoffStr = fmCutoff.toISOString().split('T')[0];

    const fmTables = ['fm_stock_price', 'fm_margin_trading', 'fm_institutional'];
    for (const table of fmTables) {
        try {
            const check = await query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
            if (check.rows[0].exists) {
                const delRes = await query(`DELETE FROM ${table} WHERE date < $1`, [fmCutoffStr]);
                if (delRes.rowCount > 0) {
                    console.log(`[LCM] 已清理 ${table} 共 ${delRes.rowCount} 筆舊資料。`);
                }
            }
        } catch (err) {
            console.warn(`[LCM] 清理 ${table} 失敗: ${err.message}`);
        }
    }
}

async function run() {
    console.log(`[LCM] 開始執行 Data LCM 任務 (${new Date().toLocaleString()})`);
    try {
        await createRealtimePartitions();
        await downsampleToMinuteK();
        await cleanupOldPartitions();
        console.log('[LCM] 所有維護任務已完成。');
    } catch (err) {
        console.error('[LCM] Data LCM 執行過程中發生錯誤:', err);
    }
}

if (require.main === module) {
    run().then(() => end());
}

module.exports = { run };
