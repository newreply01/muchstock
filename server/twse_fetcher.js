const { query, executeBatch } = require('./db');
const fetch = require('node-fetch');
const nodeFetch = fetch.default || fetch;

// 來源設定
const TWSE_MI_INDEX = 'https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&type=ALLBUT0999';
const TPEX_DAILY_URL = 'https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&o=json';
const TWSE_PE_URL = 'https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?response=json';
const TPEX_PE_URL = 'https://www.tpex.org.tw/web/stock/aftertrading/peratio_analysis/pera_result.php?l=zh-tw&o=json';
const TWSE_INST_URL = 'https://www.twse.com.tw/rwd/zh/fund/T86?response=json&selectType=ALL';
const TPEX_INST_URL = 'https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&o=json&se=EW&t=D';
const TWSE_MARGIN_URL = 'https://www.twse.com.tw/exchangeReport/MI_MARGN?response=json&selectType=ALL';
const TPEX_MARGIN_URL = 'https://www.tpex.org.tw/web/stock/margin_trading/margin_sbl/margin_sbl_result.php?l=zh-tw&o=json';

// 市場統計資料 URL
const TWSE_MARKET_INST_URL = 'https://www.twse.com.tw/rwd/zh/fund/BFI82U?response=json';
const TPEX_MARKET_INST_URL = 'https://www.tpex.org.tw/web/stock/3insti/3insti_summary/3itotal_result.php?l=zh-tw&o=json';
const TWSE_MARKET_MARGIN_URL = 'https://www.twse.com.tw/exchangeReport/MI_MARGN?response=json';
const TPEX_MARKET_MARGIN_URL = 'https://www.tpex.org.tw/web/stock/margin_trading/margin_bal/margin_bal_result.php?l=zh-tw&o=json';

// 工具函式
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const parseNumber = (str) => {
    if (!str || str === '--' || str === 'N/A' || str === '') return null;
    const cleaned = String(str).replace(/,/g, '').replace(/"/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
};

// 日期格式化
const toDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};
const toDateHyphen = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const toRocDate = (d) => { // 113/02/18
    const year = d.getFullYear() - 1911;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
};

// --- 新增：核心標的過濾器 ---
function isValidSymbol(symbol) {
    if (symbol === 'TAIEX' || symbol === 'IX0001') return true;
    return /^(\d{4}|00\d{3,4})$/.test(symbol);
}

// 插入或更新 Stock (避免 FK 錯誤)
async function ensureStock(symbol, name = symbol) {
    await query(
        `INSERT INTO stocks (symbol, name) VALUES ($1, $2) ON CONFLICT (symbol) DO NOTHING`,
        [symbol, name]
    );
}

// 檢查是否為交易日 (由 FinMind 同步的 trading_dates 表)
async function isTradingDate(dateObj) {
    const dateHyphen = toDateHyphen(dateObj);
    try {
        const res = await query('SELECT 1 FROM trading_dates WHERE date = $1', [dateHyphen]);
        return res.rows.length > 0;
    } catch (e) {
        console.error(`[isTradingDate] 檢查失敗: ${e.message}`);
        return true; // 發生錯誤時預設為 true，避免因為 DB 錯誤導致完全不抓
    }
}

const fs = require('fs');
const path = require('path');
const { getTaiwanDate, formatTaiwanTime } = require('./utils/timeUtils');
const pool = require('./db').pool;

// 日誌記錄器
function logToFile(msg) {
    const timestamp = formatTaiwanTime();
    const logMsg = `[${timestamp}] ${msg}\n`;
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    fs.appendFileSync(path.join(logDir, 'sync.log'), logMsg);
    console.log(msg);
}

async function updateProgress(dataset, stockId = '', count = -1) {
    const status = count === 0 ? 'no_data' : 'done';
    const finalCount = count < 0 ? 0 : count;
    try {
        await query(
            `INSERT INTO fm_sync_progress (dataset, stock_id, last_sync_date, status, data_count)
             VALUES ($1, $2, NOW(), $3, $4)
             ON CONFLICT (dataset, stock_id) DO UPDATE SET last_sync_date = NOW(), status = $3, data_count = $4`,
            [dataset, stockId, status, finalCount]
        );
        logToFile(`[Progress] Updated ${dataset} ${stockId} (status: ${status}, count: ${finalCount})`);
    } catch (e) {
        logToFile(`[Progress] Failed to update ${dataset}: ${e.message}`);
    }
}

// ===== 抓取上市 (TWSE) 歷史 =====
async function fetchTWSE(dateObj) {
    const dateStr = toDateStr(dateObj); // YYYYMMDD
    console.log(`[TWSE] 抓取 ${dateStr}...`);
    try {
        const url = `${TWSE_MI_INDEX}&date=${dateStr}`;
        const res = await nodeFetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' } });
        const json = await res.json();

        if (json.stat !== 'OK') {
            console.log(`[TWSE] ${dateStr} 無資料或休市: ${json.stat}`);
            return;
        }

        // --- 新增：記錄交易日 ---
        const tradeDateHyphen = toDateHyphen(dateObj);
        await query(
            `INSERT INTO trading_dates (date, description) VALUES ($1, '證交所交易日') ON CONFLICT (date) DO NOTHING`,
            [tradeDateHyphen]
        );
        await updateProgress('TaiwanStockTradingDate');

        const table = json.tables.find(t => t.title && t.title.includes('每日收盤行情'));

        // --- 新增：抓取大盤指數 ---
        const indexTable = json.tables.find(t => t.title && t.title.includes('價格指數'));
        if (indexTable && indexTable.data) {
            const taiexRow = indexTable.data.find(r => r[0] && r[0].includes('發行量加權股價指數'));
            if (taiexRow) {
                const taiexClose = parseNumber(taiexRow[1]);
                await ensureStock('TAIEX', '加權指數');
                await query(
                    `INSERT INTO daily_prices (symbol, trade_date, close_price, open_price, high_price, low_price)
                     VALUES ($1, $2, $3, $3, $3, $3)
                     ON CONFLICT (symbol, trade_date) DO UPDATE SET close_price = EXCLUDED.close_price`,
                    ['TAIEX', toDateHyphen(dateObj), taiexClose]
                );
                console.log(`[TWSE] ${dateStr} 大盤指數更新: ${taiexClose}`);
            }
        }

        if (!table) return;

        let count = 0;
        let batchRows = [];
        for (const row of table.data) {
            const symbol = row[0];
            const name = row[1];
            if (!isValidSymbol(symbol)) continue;

            await ensureStock(symbol, name);

            const volume = parseNumber(row[2]);
            const transactions = parseNumber(row[3]);
            const tradeValue = parseNumber(row[4]);
            const open = parseNumber(row[5]);
            const high = parseNumber(row[6]);
            const low = parseNumber(row[7]);
            const close = parseNumber(row[8]);

            let change = parseFloat(parseNumber(row[10]));
            if (row[9].includes('-')) change = -change;

            const changePercent = (close && change) ? (change / (close - change) * 100) : 0;

            batchRows.push([symbol, toDateHyphen(dateObj), open, high, low, close, change, changePercent, volume, tradeValue, transactions]);
            count++;
        }
        
        await executeBatch(
            'daily_prices',
            ['symbol', 'trade_date', 'open_price', 'high_price', 'low_price', 'close_price', 'change_amount', 'change_percent', 'volume', 'trade_value', 'transactions'],
            batchRows,
            'ON CONFLICT (symbol, trade_date) DO UPDATE SET open_price=EXCLUDED.open_price, close_price=EXCLUDED.close_price, volume=EXCLUDED.volume'
        );
        
        console.log(`[TWSE] ${dateStr} 更新 ${count} 筆`);
        await updateProgress('TaiwanStockPrice', '', count);
    } catch (e) {
        console.error(`[TWSE] ${dateStr} 失敗:`, e.message);
    }
}

// ===== 抓取上櫃 (TPEx) 歷史 =====
async function fetchTPEx(dateObj) {
    const rocDate = toRocDate(dateObj); // 113/02/18
    console.log(`[TPEx] 抓取 ${rocDate}...`);
    try {
        const url = `${TPEX_DAILY_URL}&d=${rocDate}`;
        // Added User-Agent to avoid blocking
        const res = await nodeFetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' } });
        const json = await res.json();

        const dataRows = (json.tables && json.tables[0] && json.tables[0].data) ? json.tables[0].data : json.aaData;
        if (!dataRows || dataRows.length === 0) {
            console.log(`[TPEx] ${rocDate} 無資料`);
            return;
        }

        let count = 0;
        let batchRows = [];
        for (const row of dataRows) {
            const symbol = row[0];
            const name = row[1];
            if (!isValidSymbol(symbol)) continue;

            await ensureStock(symbol, name);
            await query(`INSERT INTO stocks (symbol, name, market) VALUES ($1, $2, 'tpex') ON CONFLICT (symbol) DO UPDATE SET market = EXCLUDED.market`, [symbol, name]);

            const close = parseNumber(row[2]);
            const change = parseNumber(row[3]);
            const open = parseNumber(row[4]);
            const high = parseNumber(row[5]);
            const low = parseNumber(row[6]);

            // New format (tables[0].data) has an extra 'Avg Price' column at index 7.
            // Old format (aaData) was 16-17 cols, new is 19.
            const isNewFormat = row.length >= 19;
            const volume = parseNumber(isNewFormat ? row[8] : row[7]);
            const tradeValue = parseNumber(isNewFormat ? row[9] : row[8]);
            const transactions = parseNumber(isNewFormat ? row[10] : row[9]);

            const changePercent = (close && change) ? (change / (close - change) * 100) : 0;

            batchRows.push([symbol, toDateHyphen(dateObj), open, high, low, close, change, changePercent, volume, tradeValue, transactions]);
            count++;
        }
        
        await executeBatch(
            'daily_prices',
            ['symbol', 'trade_date', 'open_price', 'high_price', 'low_price', 'close_price', 'change_amount', 'change_percent', 'volume', 'trade_value', 'transactions'],
            batchRows,
            'ON CONFLICT (symbol, trade_date) DO NOTHING'
        );
        console.log(`[TPEx] ${rocDate} 更新 ${count} 筆`);
        await updateProgress('TaiwanStockPrice', '', count);
    } catch (e) {
        console.error(`[TPEx] ${rocDate} 失敗:`, e.message);
    }
}

// ===== 抓取基本面 (TWSE) 歷史 =====
async function fetchFundamentals(dateObj) {
    const dateStr = toDateStr(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[Fund] 抓取 ${dateStr}...`);
    try {
        const res = await nodeFetch(`${TWSE_PE_URL}&date=${dateStr}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' } });
        const json = await res.json();

        if (json.stat !== 'OK' || !json.data) return;

        const dyIdx = json.fields ? json.fields.indexOf("殖利率(%)") : 2;
        const peIdx = json.fields ? json.fields.indexOf("本益比") : 4;
        const pbIdx = json.fields ? json.fields.indexOf("股價淨值比") : 5;

        let count = 0;
        for (const row of json.data) {
            const symbol = row[0];
            if (!isValidSymbol(symbol)) continue;

            await ensureStock(symbol);

            const dividendYield = dyIdx !== -1 ? parseNumber(row[dyIdx]) : null;
            const peRatio = peIdx !== -1 ? parseNumber(row[peIdx]) : null;
            const pbRatio = pbIdx !== -1 ? parseNumber(row[pbIdx]) : null;

            await query(
                `INSERT INTO fundamentals (symbol, trade_date, pe_ratio, dividend_yield, pb_ratio)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (symbol, trade_date) DO UPDATE SET pe_ratio = EXCLUDED.pe_ratio, dividend_yield = EXCLUDED.dividend_yield, pb_ratio = EXCLUDED.pb_ratio`,
                [symbol, dateHyphen, peRatio, dividendYield, pbRatio]
            );
            count++;
        }
        console.log(`[Fund] ${dateStr} 更新 ${count} 筆`);
        if (count > 0) {
            await updateProgress('TaiwanStockPER', '', count);
            await updateProgress('TaiwanStockTradingDate', '', 1); // 確保這也被標記為已更新
        } else {
            await updateProgress('TaiwanStockPER', '', count);
        }
    } catch (e) {
        console.error(`[Fund] ${dateStr} 失敗:`, e.message);
    }
}

// ===== 抓取基本面 (TPEx) 歷史 =====
async function fetchTPExFundamentals(dateObj) {
    const rocDate = toRocDate(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[TPEx-Fund] 抓取 ${rocDate}...`);
    try {
        const res = await nodeFetch(`${TPEX_PE_URL}&d=${rocDate}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' } });
        const json = await res.json();

        if (!json.tables || json.tables.length === 0) return;
        const table = json.tables[0];
        if (!table.data || table.data.length === 0) return;

        const dyIdx = table.fields ? table.fields.indexOf("殖利率(%)") : 5;
        const peIdx = table.fields ? table.fields.indexOf("本益比") : 2;
        const pbIdx = table.fields ? table.fields.indexOf("股價淨值比") : 6;

        let count = 0;
        for (const row of table.data) {
            const symbol = row[0];
            if (!isValidSymbol(symbol)) continue;

            await ensureStock(symbol);

            const dividendYield = dyIdx !== -1 ? parseNumber(row[dyIdx]) : null;
            const peRatio = peIdx !== -1 ? parseNumber(row[peIdx]) : null;
            const pbRatio = pbIdx !== -1 ? parseNumber(row[pbIdx]) : null;

            await query(
                `INSERT INTO fundamentals (symbol, trade_date, pe_ratio, dividend_yield, pb_ratio)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (symbol, trade_date) DO UPDATE SET pe_ratio = EXCLUDED.pe_ratio, dividend_yield = EXCLUDED.dividend_yield, pb_ratio = EXCLUDED.pb_ratio`,
                [symbol, dateHyphen, peRatio, dividendYield, pbRatio]
            );
            count++;
        }
        console.log(`[TPEx-Fund] ${rocDate} 更新 ${count} 筆`);
        await updateProgress('TaiwanStockPER', '', count);
    } catch (e) {
        console.error(`[TPEx-Fund] ${rocDate} 失敗:`, e.message);
    }
}

// ===== 抓取三大法人 (TWSE) 歷史 =====
async function fetchInstitutional(dateObj) {
    const dateStr = toDateStr(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[Inst] 抓取 ${dateStr}...`);
    try {
        const res = await nodeFetch(`${TWSE_INST_URL}&date=${dateStr}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' } });
        const json = await res.json();

        if (json.stat !== 'OK' || !json.data) {
            console.log(`[Inst] ${dateStr} 無資料或狀態不符: ${json.stat}`);
            return;
        }

        let count = 0;
        let skipCount = 0;
        for (const row of json.data) {
            const symbol = row[0].trim();
            if (!isValidSymbol(symbol)) {
                skipCount++;
                continue;
            }

            if (row.length < 19) {
                console.warn(`[Inst] ${dateStr} 股票 ${symbol} 資料欄位不足 (${row.length} 欄)`);
                continue;
            }

            await ensureStock(symbol);

            const foreignBuy = parseNumber(row[2]);
            const foreignSell = parseNumber(row[3]);
            const foreignNet = parseNumber(row[4]) + (parseNumber(row[7]) || 0);
            const trustBuy = parseNumber(row[8]);
            const trustSell = parseNumber(row[9]);
            const trustNet = parseNumber(row[10]);
            const dealerNet = parseNumber(row[11]);
            const dealerBuy = parseNumber(row[12]) + parseNumber(row[15]);
            const dealerSell = parseNumber(row[13]) + parseNumber(row[16]);
            const totalNet = parseNumber(row[18]);

            await query(
                `INSERT INTO institutional (symbol, trade_date, foreign_buy, foreign_sell, foreign_net, trust_buy, trust_sell, trust_net, dealer_buy, dealer_sell, dealer_net, total_net)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 ON CONFLICT (symbol, trade_date) DO NOTHING`,
                [symbol, dateHyphen, foreignBuy, foreignSell, foreignNet, trustBuy, trustSell, trustNet, dealerBuy, dealerSell, dealerNet, totalNet]
            );
            count++;
        }
        console.log(`[Inst] ${dateStr} 更新 ${count} 筆 (過濾跳過 ${skipCount} 筆)`);
        await updateProgress('TaiwanStockInstitutional', '', count);
    } catch (e) {
        console.error(`[Inst] ${dateStr} 失敗:`, e.message);
    }
}

// ===== 抓取三大法人 (TPEx) 歷史 =====
async function fetchTPExInstitutional(dateObj) {
    const rocDate = toRocDate(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[TPEx-Inst] 抓取 ${rocDate}...`);
    try {
        const url = `${TPEX_INST_URL}&d=${rocDate}`;
        const res = await nodeFetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' } });
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error(`[TPEx-Inst] ${rocDate} JSON 解析失敗:`, e.message);
            console.log(`[TPEx-Inst] 回傳內容前 200 字: ${text.substring(0, 200)}`);
            return;
        }

        const dataRows = (json.tables && json.tables[0] && json.tables[0].data) ? json.tables[0].data : json.aaData;
        if (!dataRows || dataRows.length === 0) {
            console.log(`[TPEx-Inst] ${rocDate} 無資料`);
            return;
        }

        let count = 0;
        let skipCount = 0;
        for (const row of dataRows) {
            const symbol = row[0].trim();
            if (!isValidSymbol(symbol)) {
                skipCount++;
                continue;
            }

            await ensureStock(symbol);

            let foreignBuy, foreignSell, foreignNet, trustBuy, trustSell, trustNet, dealerBuy, dealerSell, dealerNet, totalNet;

            if (row.length >= 24) {
                foreignBuy = parseNumber(row[8]);
                foreignSell = parseNumber(row[9]);
                foreignNet = parseNumber(row[10]);
                trustBuy = parseNumber(row[11]);
                trustSell = parseNumber(row[12]);
                trustNet = parseNumber(row[13]);
                dealerBuy = parseNumber(row[20]);
                dealerSell = parseNumber(row[21]);
                dealerNet = parseNumber(row[22]);
                totalNet = parseNumber(row[23]);
            } else {
                foreignBuy = parseNumber(row[8]);
                foreignSell = parseNumber(row[9]);
                foreignNet = parseNumber(row[10]);
                trustBuy = parseNumber(row[11]);
                trustSell = parseNumber(row[12]);
                trustNet = parseNumber(row[13]);
                dealerBuy = parseNumber(row[14]);
                dealerSell = parseNumber(row[15]);
                dealerNet = parseNumber(row[16]);
                totalNet = parseNumber(row[19]);
            }

            await query(
                `INSERT INTO institutional (symbol, trade_date, foreign_buy, foreign_sell, foreign_net, trust_buy, trust_sell, trust_net, dealer_buy, dealer_sell, dealer_net, total_net)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 ON CONFLICT (symbol, trade_date) DO NOTHING`,
                [symbol, dateHyphen, foreignBuy, foreignSell, foreignNet, trustBuy, trustSell, trustNet, dealerBuy, dealerSell, dealerNet, totalNet]
            );
            count++;
        }
        console.log(`[TPEx-Inst] ${rocDate} 更新 ${count} 筆 (過濾跳過 ${skipCount} 筆)`);
        await updateProgress('TaiwanStockInstitutional', '', count);
    } catch (e) {
        console.error(`[TPEx-Inst] ${rocDate} 失敗:`, e.message);
    }
}

// ===== 抓取融資融券 (TWSE) 歷史 =====
async function fetchMarginTrading(dateObj) {
    const dateStr = toDateStr(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[Margin] 抓取 TWSE ${dateStr}...`);
    try {
        const res = await nodeFetch(`${TWSE_MARGIN_URL}&date=${dateStr}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const json = await res.json();
        if (json.stat !== 'OK' || !json.data) return;

        let count = 0;
        for (const row of json.data) {
            const symbol = row[0].trim();
            if (!isValidSymbol(symbol)) continue;

            await ensureStock(symbol);
            await query(`
                INSERT INTO fm_margin_trading (
                    stock_id, date, 
                    margin_purchase_buy, margin_purchase_sell, margin_purchase_cash_repayment, margin_purchase_yesterday_balance, margin_purchase_today_balance, margin_purchase_limit,
                    short_sale_buy, short_sale_sell, short_sale_cash_repayment, short_sale_yesterday_balance, short_sale_today_balance, short_sale_limit,
                    offsetting_margin_short
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (stock_id, date) DO UPDATE SET
                    margin_purchase_buy = EXCLUDED.margin_purchase_buy,
                    margin_purchase_sell = EXCLUDED.margin_purchase_sell,
                    margin_purchase_today_balance = EXCLUDED.margin_purchase_today_balance,
                    short_sale_today_balance = EXCLUDED.short_sale_today_balance,
                    offsetting_margin_short = EXCLUDED.offsetting_margin_short
            `, [
                symbol, dateHyphen,
                parseNumber(row[2]), parseNumber(row[3]), parseNumber(row[4]), parseNumber(row[5]), parseNumber(row[6]), parseNumber(row[7]),
                parseNumber(row[8]), parseNumber(row[9]), parseNumber(row[10]), parseNumber(row[11]), parseNumber(row[12]), parseNumber(row[13]),
                parseNumber(row[14])
            ]);
            count++;
        }
        console.log(`[Margin] TWSE ${dateStr} 更新 ${count} 筆`);
        await updateProgress('TaiwanStockMarginPurchaseShortSale', '', count);
    } catch (e) {
        console.error(`[Margin] TWSE ${dateStr} 失敗:`, e.message);
    }
}

// ===== 抓取融資融券 (TPEx) 歷史 =====
async function fetchTPExMarginTrading(dateObj) {
    const rocDate = toRocDate(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[Margin] 抓取 TPEx ${rocDate}...`);
    try {
        const res = await nodeFetch(`${TPEX_MARGIN_URL}&d=${rocDate}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const json = await res.json();
        const dataRows = (json.tables && json.tables[0] && json.tables[0].data) ? json.tables[0].data : json.aaData;
        if (!dataRows || dataRows.length === 0) return;

        let count = 0;
        for (const row of dataRows) {
            const symbol = row[0].trim();
            if (!isValidSymbol(symbol)) continue;

            await ensureStock(symbol);
            // TPEx indices: 4: M-Buy, 5: M-Sell, 6: M-Cash, 7: M-Prev, 8: M-Curr, 9: M-Limit
            // 10: S-Buy, 11: S-Sell, 12: S-Cash, 13: S-Prev, 14: S-Curr, 15: S-Limit, 16: Offset
            await query(`
                INSERT INTO fm_margin_trading (
                    stock_id, date, 
                    margin_purchase_buy, margin_purchase_sell, margin_purchase_cash_repayment, margin_purchase_yesterday_balance, margin_purchase_today_balance, margin_purchase_limit,
                    short_sale_buy, short_sale_sell, short_sale_cash_repayment, short_sale_yesterday_balance, short_sale_today_balance, short_sale_limit,
                    offsetting_margin_short
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (stock_id, date) DO UPDATE SET
                    margin_purchase_buy = EXCLUDED.margin_purchase_buy,
                    margin_purchase_sell = EXCLUDED.margin_purchase_sell,
                    margin_purchase_today_balance = EXCLUDED.margin_purchase_today_balance,
                    short_sale_today_balance = EXCLUDED.short_sale_today_balance,
                    offsetting_margin_short = EXCLUDED.offsetting_margin_short
            `, [
                symbol, dateHyphen,
                parseNumber(row[4]), parseNumber(row[5]), parseNumber(row[6]), parseNumber(row[7]), parseNumber(row[8]), parseNumber(row[9]),
                parseNumber(row[10]), parseNumber(row[11]), parseNumber(row[12]), parseNumber(row[13]), parseNumber(row[14]), parseNumber(row[15]),
                parseNumber(row[16])
            ]);
            count++;
        }
        console.log(`[Margin] TPEx ${rocDate} 更新 ${count} 筆`);
        await updateProgress('TaiwanStockMarginPurchaseShortSale', '', count);
    } catch (e) {
        console.error(`[Margin] TPEx ${rocDate} 失敗:`, e.message);
    }
}

// ===== 抓取大盤法人 (TWSE + TPEx) 歷史 =====
async function fetchMarketInstitutional(dateObj) {
    const dateStr = toDateStr(dateObj);
    const rocDate = toRocDate(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[Market-Inst] 抓取 ${dateHyphen}...`);

    let marketData = {
        'Foreign_Investor': { buy: 0, sell: 0 },
        'Investment_Trust': { buy: 0, sell: 0 },
        'Dealer_self': { buy: 0, sell: 0 },
        'Dealer_Hedging': { buy: 0, sell: 0 },
        'total': { buy: 0, sell: 0 }
    };

    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // 1. TWSE
    try {
        const res = await nodeFetch(`${TWSE_MARKET_INST_URL}&dayDate=${dateStr}`, { headers: { 'User-Agent': UA } });
        const json = await res.json();
        if (json.stat === 'OK' && json.data) {
            for (const row of json.data) {
                const name = row[0].trim();
                const buy = parseNumber(row[1]) || 0;
                const sell = parseNumber(row[2]) || 0;
                
                if (name.includes('外資')) {
                    marketData.Foreign_Investor.buy += buy;
                    marketData.Foreign_Investor.sell += sell;
                } else if (name.includes('投信')) {
                    marketData.Investment_Trust.buy += buy;
                    marketData.Investment_Trust.sell += sell;
                } else if (name.includes('自營商') && name.includes('自行買賣')) {
                    marketData.Dealer_self.buy += buy;
                    marketData.Dealer_self.sell += sell;
                } else if (name.includes('自營商回補') || name.includes('避險')) {
                    marketData.Dealer_Hedging.buy += buy;
                    marketData.Dealer_Hedging.sell += sell;
                } else if (name.includes('合計') || name.includes('總計')) {
                    marketData.total.buy += buy;
                    marketData.total.sell += sell;
                }
            }
        }
    } catch (e) { console.error(`[Market-Inst] TWSE ${dateStr} 失敗:`, e.message); }

    // 2. TPEx
    try {
        const res = await nodeFetch(`${TPEX_MARKET_INST_URL}&d=${rocDate}`, { 
            headers: { 
                'User-Agent': UA,
                'Referer': 'https://www.tpex.org.tw/zh-tw/mainboard/trading/institutional/3insti-summary.html'
            } 
        });
        const json = await res.json();
        const rows = json.aaData || (json.tables && json.tables[0] && json.tables[0].data) || json.data;
        if (rows) {
            for (const row of rows) {
                const name = row[0].trim();
                const buy = parseNumber(row[1]) || 0;
                const sell = parseNumber(row[2]) || 0;

                if (name.includes('外資')) {
                    marketData.Foreign_Investor.buy += buy;
                    marketData.Foreign_Investor.sell += sell;
                } else if (name.includes('投信')) {
                    marketData.Investment_Trust.buy += buy;
                    marketData.Investment_Trust.sell += sell;
                } else if (name.includes('自營商') && name.includes('自行買賣')) {
                    marketData.Dealer_self.buy += buy;
                    marketData.Dealer_self.sell += sell;
                } else if (name.includes('自營商') && (name.includes('避險') || name.includes('回補'))) {
                    marketData.Dealer_Hedging.buy += buy;
                    marketData.Dealer_Hedging.sell += sell;
                }
            }
        }
    } catch (e) { console.error(`[Market-Inst] TPEx ${rocDate} 失敗:`, e.message); }

    // Save to DB
    for (const [name, val] of Object.entries(marketData)) {
        if (val.buy === 0 && val.sell === 0 && name !== 'total') continue;
        await query(
            `INSERT INTO fm_total_institutional (date, name, buy, sell) VALUES ($1, $2, $3, $4)
             ON CONFLICT (date, name) DO UPDATE SET buy = EXCLUDED.buy, sell = EXCLUDED.sell`,
            [dateHyphen, name, val.buy, val.sell]
        );
    }
    console.log(`[Market-Inst] ${dateHyphen} 更新完成`);
    await updateProgress('TaiwanStockTotalInstitutionalInvestors', '', 1);
}

// ===== 抓取大盤融資融券 (TWSE + TPEx) 歷史 =====
async function fetchMarketMargin(dateObj) {
    const dateStr = toDateStr(dateObj);
    const rocDate = toRocDate(dateObj);
    const dateHyphen = toDateHyphen(dateObj);
    console.log(`[Market-Margin] 抓取 ${dateHyphen}...`);

    let marginData = {
        'MarginPurchaseMoney': { buy: 0, sell: 0, balance: 0 },
        'ShortSale': { buy: 0, sell: 0, balance: 0 }
    };

    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // 1. TWSE
    try {
        const res = await nodeFetch(`${TWSE_MARKET_MARGIN_URL}&date=${dateStr}`, { headers: { 'User-Agent': UA } });
        const json = await res.json();
        if (json.stat === 'OK' && json.tables) {
            // 修正：標題是 "信用交易統計" 或 "融資融券餘額"
            const table = json.tables.find(t => t.title && (t.title.includes('信用交易統計') || t.title.includes('融資融券餘額')));
            if (table && table.data) {
                const mRow = table.data.find(r => r[0].includes('融資金額'));
                const sRow = table.data.find(r => r[0].includes('融券(交易單位)'));
                if (mRow) {
                    marginData.MarginPurchaseMoney.buy += (parseNumber(mRow[1]) || 0) * 1000;
                    marginData.MarginPurchaseMoney.sell += (parseNumber(mRow[2]) || 0) * 1000;
                    marginData.MarginPurchaseMoney.balance += (parseNumber(mRow[5]) || 0) * 1000;
                }
                if (sRow) {
                    marginData.ShortSale.buy += parseNumber(sRow[1]) || 0;
                    marginData.ShortSale.sell += parseNumber(sRow[2]) || 0;
                    marginData.ShortSale.balance += parseNumber(sRow[5]) || 0;
                }
            }
        }
    } catch (e) { console.error(`[Market-Margin] TWSE ${dateStr} 失敗:`, e.message); }

    // 2. TPEx
    try {
        const res = await nodeFetch(`${TPEX_MARKET_MARGIN_URL}&d=${rocDate}`, { 
            headers: { 
                'User-Agent': UA,
                'Referer': 'https://www.tpex.org.tw/zh-tw/mainboard/trading/margin/margin-bal.html'
            } 
        });
        const json = await res.json();
        const rows = json.aaData || (json.tables && json.tables[0] && json.tables[0].data) || json.data;
        if (rows) {
            // TPEx rows: 0: 融資(金), 1: 融券(張)
            const mRow = rows[0];
            const sRow = rows[1];
            if (mRow) {
                marginData.MarginPurchaseMoney.buy += (parseNumber(mRow[1]) || 0) * 1000;
                marginData.MarginPurchaseMoney.sell += (parseNumber(mRow[2]) || 0) * 1000;
                marginData.MarginPurchaseMoney.balance += (parseNumber(mRow[4]) || 0) * 1000;
            }
            if (sRow) {
                marginData.ShortSale.buy += parseNumber(sRow[1]) || 0;
                marginData.ShortSale.sell += parseNumber(sRow[2]) || 0;
                marginData.ShortSale.balance += parseNumber(sRow[4]) || 0;
            }
        }
    } catch (e) { console.error(`[Market-Margin] TPEx ${rocDate} 失敗:`, e.message); }

    // Save to DB in multi-row format (FinMind compatible)
    for (const [name, val] of Object.entries(marginData)) {
        await query(`
            INSERT INTO fm_total_margin (
                date, name, margin_purchase_buy, margin_purchase_sell, margin_purchase_today_balance,
                short_sale_buy, short_sale_sell, short_sale_today_balance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (date, name) DO UPDATE SET
                margin_purchase_buy = EXCLUDED.margin_purchase_buy,
                margin_purchase_sell = EXCLUDED.margin_purchase_sell,
                margin_purchase_today_balance = EXCLUDED.margin_purchase_today_balance,
                short_sale_buy = EXCLUDED.short_sale_buy,
                short_sale_sell = EXCLUDED.short_sale_sell,
                short_sale_today_balance = EXCLUDED.short_sale_today_balance
        `, [
            dateHyphen, name, 
            name === 'MarginPurchaseMoney' ? val.buy : 0, 
            name === 'MarginPurchaseMoney' ? val.sell : 0, 
            name === 'MarginPurchaseMoney' ? val.balance : 0,
            name === 'ShortSale' ? val.buy : 0, 
            name === 'ShortSale' ? val.sell : 0, 
            name === 'ShortSale' ? val.balance : 0
        ]);
    }

    console.log(`[Market-Margin] ${dateHyphen} 更新完成 (格式已過渡至多行)`);
    // Cleanup old 'Total' row if exists
    await query(`DELETE FROM fm_total_margin WHERE date = $1 AND name = 'Total'`, [dateHyphen]);
    await updateProgress('TaiwanStockTotalMarginPurchaseShortSale', '', 1);
}


// ===== 通用抓取區間迴圈 =====
async function fetchRange(startDate, endDate) {
    console.log(`📅 執行區間抓取: ${toDateHyphen(startDate)} -> ${toDateHyphen(endDate)}`);
    console.log(`🚀 開始從證交所/櫃買中心獲取歷史資料...`);
    let current = new Date(startDate);

    // Normalize time to avoid infinite loops due to DST/Timezone
    current.setHours(0, 0, 0, 0);
    let end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            current.setDate(current.getDate() + 1);
            continue;
        }

        // --- 新增：檢查國定假日 ---
        const isTrading = await isTradingDate(current);
        if (!isTrading) {
            console.log(`📅 [Skip] ${toDateHyphen(current)} 是假日或非交易日，跳過。`);
            current.setDate(current.getDate() + 1);
            continue;
        }

        // 執行當日抓取
        await fetchTWSE(current);
        await sleep(1000);
        await fetchTPEx(current);
        await sleep(1000);
        await fetchFundamentals(current);
        await sleep(1000);
        await fetchTPExFundamentals(current);
        await sleep(1000);
        await fetchInstitutional(current);
        await sleep(1000);
        await fetchTPExInstitutional(current);
        await sleep(1000);
        await fetchMarginTrading(current);
        await sleep(1000);
        await fetchTPExMarginTrading(current);
        await sleep(1000);
        await fetchMarketInstitutional(current);
        await sleep(1000);
        await fetchMarketMargin(current);

        console.log(`⏳ 休眠 3 秒...`);
        await sleep(3000);

        current.setDate(current.getDate() + 1);
    }
    // 更新昨收快照
    await updateLastCloseSnapshot();
}

// ===== 更新昨收快照 (用於即時行情基準) =====
async function updateLastCloseSnapshot() {
    console.log(`🚀 [Snapshot] 正在更新昨收價快照表 (snapshot_last_close)...`);
    try {
        await query(`
            INSERT INTO snapshot_last_close (symbol, yest_close, today_close, last_update)
            WITH ranked_prices AS (
                SELECT 
                    symbol, 
                    close_price, 
                    trade_date,
                    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_date DESC) as rank
                FROM daily_prices
            )
            SELECT 
                t1.symbol,
                t2.close_price as yest_close,
                t1.close_price as today_close,
                t1.trade_date as last_update
            FROM ranked_prices t1
            LEFT JOIN ranked_prices t2 ON t1.symbol = t2.symbol AND t2.rank = 2
            WHERE t1.rank = 1
            ON CONFLICT (symbol) DO UPDATE SET
                yest_close = EXCLUDED.yest_close,
                today_close = EXCLUDED.today_close,
                last_update = EXCLUDED.last_update
        `);
        console.log(`✅ [Snapshot] 快照表更新完成！`);
    } catch (e) {
        console.error(`❌ [Snapshot] 快照表更新失敗:`, e.message);
    }
}

// ===== 主流程：自動補齊 =====
async function catchUp() {
    const today = getTaiwanDate();
    today.setHours(0, 0, 0, 0);
    console.log(`[CatchUp] Today is ${toDateHyphen(today)}`);
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(today.getFullYear() - 3);

    // 取得資料庫範圍
    let dbMin = null;
    let dbMax = null;
    try {
        const res = await query('SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date FROM daily_prices');
        if (res.rows.length > 0) {
            if (res.rows[0].min_date) dbMin = new Date(res.rows[0].min_date);
            if (res.rows[0].max_date) dbMax = new Date(res.rows[0].max_date);
        }
    } catch (e) {
        console.error('查詢日期範圍失敗:', e.message);
    }

    // 狀況 1: 資料庫全空 -> 從 3 年前抓到今天
    if (!dbMin) {
        console.log('⚠️ 資料庫為空，開始完整回補 3 年資料...');
        await fetchRange(threeYearsAgo, today);
        return;
    }

    // 狀況 2: 回補舊資料 (History Backfill)
    if (dbMin > threeYearsAgo) {
        // 設定回補結束點為 dbMin 的前一天
        const endBackfill = new Date(dbMin);
        endBackfill.setDate(endBackfill.getDate() - 1);

        // 確保範圍有效
        if (endBackfill >= threeYearsAgo) {
            console.log(`📉 發現舊資料缺漏 (DB始於 ${toDateHyphen(dbMin)})，開始回補 (${toDateHyphen(threeYearsAgo)} -> ${toDateHyphen(endBackfill)})...`);
            await fetchRange(threeYearsAgo, endBackfill);
        }
    }

    // 狀況 3: 補齊新資料 (New Data Catch-up)
    const normDbMax = new Date(dbMax); normDbMax.setHours(0, 0, 0, 0);
    const normToday = new Date(today); normToday.setHours(0, 0, 0, 0);

    if (normDbMax < today) {
        const startCatchUp = new Date(dbMax);
        startCatchUp.setDate(startCatchUp.getDate() + 1);
        console.log(`📈 發現新資料缺漏 (DB止於 ${toDateHyphen(dbMax)})，開始補齊 (${toDateHyphen(startCatchUp)} -> ${toDateHyphen(today)})...`);
        await fetchRange(startCatchUp, today);
    } else {
        console.log(`✅ 價格資料庫已包含今日數據 (${toDateHyphen(normDbMax)})，檢查籌碼資料...`);
        // 額外檢查籌碼資料是否落後
        try {
            const instRes = await query('SELECT MAX(trade_date) as max_date FROM institutional');
            const instMax = instRes.rows[0].max_date ? new Date(instRes.rows[0].max_date) : null;
            console.log(`[CatchUp] Inst Max Date: ${instMax ? toDateHyphen(instMax) : 'NULL'}`);
            if (!instMax || instMax < normDbMax) {
                const startInst = instMax ? new Date(instMax) : new Date(threeYearsAgo);
                if (instMax) startInst.setDate(startInst.getDate() + 1);
                console.log(`📊 發現籌碼資料落後，開始回補 (${toDateHyphen(startInst)} -> ${toDateHyphen(normDbMax)})...`);
                await fetchRange(startInst, normDbMax);
            }
        } catch (e) {
            console.error('檢查籌碼日期失敗:', e.message);
        }
    }

    console.log('🎉 所有資料檢查與補齊完成！');
    const finalCheck = await query('SELECT COUNT(*) as count, MAX(trade_date) as max_date FROM daily_prices');
    console.log(`📊 最終同步狀態: ${finalCheck.rows[0].count} 筆價格資料, 最新日期: ${finalCheck.rows[0].max_date}`);
}

if (require.main === module) {
    const { initDatabase } = require('./db');
    initDatabase()
        .then(() => catchUp())
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { 
    catchUp, 
    fetchRange, 
    fetchTWSE, 
    fetchTPEx, 
    updateLastCloseSnapshot,
    fetchMarketInstitutional,
    fetchMarketMargin
};
