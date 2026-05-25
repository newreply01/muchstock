const { query, end } = require('../db');

async function reconstruct() {
    try {
        console.log('🏗️ 開始重構 Tick 儲存架構...');

        // 1. 處理當日表 realtime_ticks (改回標準表)
        console.log('1. 重構當日表 realtime_ticks...');
        await query(`DROP TABLE IF EXISTS realtime_ticks CASCADE`);
        await query(`
            CREATE TABLE realtime_ticks (
                id BIGSERIAL,
                symbol VARCHAR(20) NOT NULL,
                trade_time TIMESTAMPTZ NOT NULL,
                price NUMERIC,
                open_price NUMERIC,
                high_price NUMERIC,
                low_price NUMERIC,
                volume BIGINT,
                trade_volume BIGINT,
                buy_intensity SMALLINT,
                sell_intensity SMALLINT,
                five_levels JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                previous_close NUMERIC,
                PRIMARY KEY (symbol, trade_time)
            )
        `);
        await query(`CREATE INDEX idx_realtime_ticks_time ON realtime_ticks (trade_time DESC)`);

        // 2. 處理歷史表 realtime_ticks_history (改為按月分區)
        console.log('2. 重構歷史表 realtime_ticks_history (準備分區)...');
        await query(`ALTER TABLE IF EXISTS realtime_ticks_history RENAME TO realtime_ticks_history_old`);
        
        await query(`
            CREATE TABLE realtime_ticks_history (
                id BIGINT,
                symbol VARCHAR(20) NOT NULL,
                trade_time TIMESTAMPTZ NOT NULL,
                price NUMERIC,
                open_price NUMERIC,
                high_price NUMERIC,
                low_price NUMERIC,
                volume BIGINT,
                trade_volume BIGINT,
                buy_intensity SMALLINT,
                sell_intensity SMALLINT,
                five_levels JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                previous_close NUMERIC,
                PRIMARY KEY (symbol, trade_time)
            ) PARTITION BY RANGE (trade_time)
        `);

        // 3. 建立 2026 年 3 月與 4 月分區
        console.log('3. 建立 2026_03 與 2026_04 分區...');
        await query(`
            CREATE TABLE realtime_ticks_history_2026_03 
            PARTITION OF realtime_ticks_history 
            FOR VALUES FROM ('2026-03-01') TO ('2026-04-01')
        `);
        await query(`
            CREATE TABLE realtime_ticks_history_2026_04 
            PARTITION OF realtime_ticks_history 
            FOR VALUES FROM ('2026-04-01') TO ('2026-05-01')
        `);

        // 4. 資料大遷移 (1,600 萬筆)
        console.log('4. 正在遷移 1,600 萬筆數據 (此步驟需較長時間)...');
        const migrateRes = await query(`
            INSERT INTO realtime_ticks_history 
            SELECT * FROM realtime_ticks_history_old
            ON CONFLICT (symbol, trade_time) DO NOTHING
        `);
        console.log(`✅ 遷移完成：${migrateRes.rowCount} 筆資料。`);

        // 5. 清理舊表
        await query(`DROP TABLE realtime_ticks_history_old`);
        console.log('✨ 全系統架構重構完成！');

    } catch (err) {
        console.error('❌ 重構失敗:', err.message);
    } finally {
        await end();
    }
}

reconstruct();
