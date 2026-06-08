// FinMind API Configuration and Token Management
// Note: FinMind has a rate limit of 600 calls per hour per token.
// Tokens can be configured in the .env file as FINMIND_TOKENS=token1,token2

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('./db');
const fetch = require('node-fetch');
const nodeFetch = fetch.default || fetch;

const BASE_URL = 'https://api.finmindtrade.com/api/v4/data';
const TOKENS = (process.env.FINMIND_TOKENS || process.env.FINMIND_TOKEN || '')
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

const START_DATE = '2020-01-01'; // Default start date if not provided

// --- 新增：核心標的過濾器 ---
function isValidSymbol(symbol) {
    if (!symbol || symbol === 'TAIEX' || symbol === 'IX0001') return true;
    return /^(\d{4}|00\d{3,4})$/.test(symbol);
}

let currentTokenIndex = 0;
function getCurrentToken() {
    if (TOKENS.length === 0) return null;
    return TOKENS[currentTokenIndex];
}
const exhaustedTokens = new Set(); // 記錄已耗盡額度的 token

function rotateToken(reason = '') {
    if (TOKENS.length <= 1) return false;
    exhaustedTokens.add(currentTokenIndex);
    // 找下一個尚未耗盡的 token
    for (let i = 1; i < TOKENS.length; i++) {
        const nextIndex = (currentTokenIndex + i) % TOKENS.length;
        if (!exhaustedTokens.has(nextIndex)) {
            currentTokenIndex = nextIndex;
            console.log(`🔄 [Token] 切換至 Token #${nextIndex + 1}/${TOKENS.length} (原因: ${reason})`);
            return true;
        }
    }
    console.error(`❌ [Token] 所有 ${TOKENS.length} 組 Token 額度皆已耗盡！`);
    return false;
}

function getTokenStatus() {
    const available = TOKENS.length - exhaustedTokens.size;
    return `🔑 [Token] 共 ${TOKENS.length} 組，可用 ${available} 組，目前使用 Token #${currentTokenIndex + 1}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function updateProgress(dataset, stockId = '', count = -1) {
    const status = count === 0 ? 'no_data' : 'done';
    const finalCount = count < 0 ? 0 : count;
    try {
        await pool.query(
            `INSERT INTO fm_sync_progress (dataset, stock_id, last_sync_date, status, data_count)
             VALUES ($1, $2, NOW(), $3, $4)
             ON CONFLICT (dataset, stock_id) DO UPDATE SET last_sync_date = NOW(), status = $3, data_count = $4`,
            [dataset, stockId, status, finalCount]
        );
    } catch (e) {
        console.error(`[Progress] Failed to update ${dataset}:`, e.message);
    }
}

async function fetchFinMind(dataset, data_id, start_date = START_DATE) {
    if (data_id && !isValidSymbol(data_id)) {
        console.log(`🛡️ [FinMind] 攔截無效標的擷取: ${data_id}`);
        return [];
    }

    let url = `${BASE_URL}?dataset=${dataset}&data_id=${data_id}&start_date=${start_date}`;
    const token = getCurrentToken();
    if (token) {
        url += `&token=${token}`;
    }
    console.log(`🔍 [FinMind] Requesting: ${url}`);
    try {
        const res = await nodeFetch(url);
        if (!res.ok) {
            if (res.status === 429) {
                console.warn(`⚠️ [FinMind] Rate limited on Token #${currentTokenIndex + 1}. Trying to rotate...`);
                if (rotateToken('HTTP 429 Rate Limited')) {
                    return fetchFinMind(dataset, data_id, start_date);
                }
                console.warn(`⚠️ [FinMind] 所有 Token 都被限速，等待 60s...`);
                await sleep(60000);
                exhaustedTokens.clear();
                return fetchFinMind(dataset, data_id, start_date);
            }
            if (res.status === 402) {
                console.warn(`⚠️ [FinMind] Token #${currentTokenIndex + 1} 額度耗盡 (HTTP 402)`);
                if (rotateToken('HTTP 402 Payment Required')) {
                    return fetchFinMind(dataset, data_id, start_date);
                }
                console.warn(`⚠️ [FinMind] 所有 ${TOKENS.length} 組 Token 額度皆已耗盡 (HTTP 402)，等待 60s 後重試...`);
                await sleep(60000);
                exhaustedTokens.clear();
                return fetchFinMind(dataset, data_id, start_date);
            }
            const errorBody = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorBody}`);
        }
        const json = await res.json();
        const data = json.data || [];
        return data;
    } catch (err) {
        console.error(`❌ [FinMind] Error fetching ${dataset} for ${data_id}:`, err.message);
        return [];
    }
}

async function syncBrokerTrading(symbol, date) {
    const client = await pool.connect();
    try {
        const start_date = date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        console.log(`🔄 [FinMind] Syncing broker trading for ${symbol} starting from ${start_date}...`);
        const data = await fetchFinMind('TaiwanStockBrokerTrading', symbol, start_date);
        for (const item of data) {
            await client.query(`
                INSERT INTO fm_broker_trading (stock_id, date, broker, buy, sell)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (stock_id, date, broker) DO UPDATE SET
                    buy = EXCLUDED.buy,
                    sell = EXCLUDED.sell
            `, [item.stock_id, item.date, item.broker, item.buy, item.sell]);
        }
        console.log(`✅ [FinMind] Synced broker trading for ${symbol}: ${data.length} records.`);
        await updateProgress('TaiwanStockBrokerTrading', symbol, data ? data.length : 0);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync broker trading for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncMarginTrading(symbol) {
    const client = await pool.connect();
    try {
        const start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        console.log(`🔄 [FinMind] Syncing margin trading for ${symbol} starting from ${start_date}...`);
        const data = await fetchFinMind('TaiwanStockMarginPurchaseShortSale', symbol, start_date);
        for (const item of data) {
            await client.query(`
                INSERT INTO fm_margin_trading (
                    stock_id, date, 
                    margin_purchase_buy, margin_purchase_sell, margin_purchase_cash_repayment, margin_purchase_limit, margin_purchase_today_balance, margin_purchase_yesterday_balance,
                    short_sale_buy, short_sale_sell, short_sale_cash_repayment, short_sale_limit, short_sale_today_balance, short_sale_yesterday_balance,
                    offsetting_margin_short
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (stock_id, date) DO UPDATE SET
                    margin_purchase_today_balance = EXCLUDED.margin_purchase_today_balance,
                    short_sale_today_balance = EXCLUDED.short_sale_today_balance,
                    margin_purchase_buy = EXCLUDED.margin_purchase_buy,
                    margin_purchase_sell = EXCLUDED.margin_purchase_sell,
                    short_sale_buy = EXCLUDED.short_sale_buy,
                    short_sale_sell = EXCLUDED.short_sale_sell,
                    offsetting_margin_short = EXCLUDED.offsetting_margin_short
            `, [
                item.stock_id, item.date,
                item.MarginPurchaseBuy, item.MarginPurchaseSell, item.MarginPurchaseCashRepayment, item.MarginPurchaseLimit, item.MarginPurchaseTodayBalance, item.MarginPurchaseYesterdayBalance,
                item.ShortSaleBuy, item.ShortSaleSell, item.ShortSaleCashRepayment, item.ShortSaleLimit, item.ShortSaleTodayBalance, item.ShortSaleYesterdayBalance,
                item.OffsetLoanAndShort || 0
            ]);
        }
        console.log(`✅ [FinMind] Synced margin trading for ${symbol}: ${data.length} records.`);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync margin trading for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncInstitutional(symbol) {
    const client = await pool.connect();
    try {
        const start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        console.log(`🔄 [FinMind] Syncing institutional investors for ${symbol} from ${start_date}...`);
        const data = await fetchFinMind('TaiwanStockInstitutionalInvestorsBuySell', symbol, start_date);
        for (const item of data) {
            await client.query(`
                INSERT INTO fm_institutional (stock_id, date, name, buy, sell)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (stock_id, date, name) DO UPDATE SET
                    buy = EXCLUDED.buy,
                    sell = EXCLUDED.sell
            `, [item.stock_id, item.date, item.name, item.buy, item.sell]);
        }
        console.log(`✅ [FinMind] Synced institutional for ${symbol}: ${data.length} records.`);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync institutional for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncTotalInstitutional(date) {
    const client = await pool.connect();
    try {
        const start_date = date || '2021-01-01';
        console.log(`🔄 [FinMind] Syncing total market institutional investors from ${start_date}...`);
        const data = await fetchFinMind('TaiwanStockTotalInstitutionalInvestors', '', start_date);
        
        for (const item of data) {
            await client.query(`
                INSERT INTO fm_total_institutional (date, name, buy, sell)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (date, name) DO UPDATE SET
                    buy = EXCLUDED.buy,
                    sell = EXCLUDED.sell
            `, [item.date, item.name, item.buy, item.sell]);
        }
        await updateProgress('TaiwanStockTotalInstitutionalInvestors');
        console.log(`✅ [FinMind] Synced total institutional: ${data.length} records.`);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync total institutional:`, err.message);
    } finally {
        client.release();
    }
}

async function syncTotalMargin(date) {
    const client = await pool.connect();
    try {
        const start_date = date || '2021-01-01';
        console.log(`🔄 [FinMind] Syncing total market margin trading from ${start_date}...`);
        const data = await fetchFinMind('TaiwanStockTotalMarginPurchaseShortSale', '', start_date);
        
        for (const item of data) {
            await client.query(`
                INSERT INTO fm_total_margin (
                    date, margin_purchase_buy, margin_purchase_sell, 
                    short_sale_buy, short_sale_sell, 
                    short_sale_today_balance, margin_purchase_today_balance
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT ON CONSTRAINT fm_total_margin_pkey DO UPDATE SET
                    margin_purchase_buy = EXCLUDED.margin_purchase_buy,
                    margin_purchase_sell = EXCLUDED.margin_purchase_sell,
                    short_sale_buy = EXCLUDED.short_sale_buy,
                    short_sale_sell = EXCLUDED.short_sale_sell,
                    short_sale_today_balance = EXCLUDED.short_sale_today_balance,
                    margin_purchase_today_balance = EXCLUDED.margin_purchase_today_balance
            `, [
                item.date, 
                item.MarginPurchaseBuy, item.MarginPurchaseSell, 
                item.ShortSaleBuy, item.ShortSaleSell, 
                item.ShortSaleTodayBalance, item.MarginPurchaseTodayBalance
            ]);
        }
        await updateProgress('TaiwanStockTotalMarginPurchaseShortSale');
        console.log(`✅ [FinMind] Synced total margin: ${data.length} records.`);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync total margin:`, err.message);
    } finally {
        client.release();
    }
}

async function syncFinancialRatios(symbol) {
    const client = await pool.connect();
    try {
        console.log(`🔄 [FinMind] Calculating financial ratios (ROE/ROA/Margins) for ${symbol}...`);

        console.log(`🔍 [FinMind] Debugging syncFinancialRatios for ${symbol}`);

        // Let's just fetch EVERYTHING for this symbol and log it
        const allRes = await client.query(`SELECT type, item, date FROM fm_financial_statements WHERE stock_id = $1 LIMIT 10`, [symbol]);
        console.log(`🔍 [FinMind] Total rows for ${symbol} in DB: ${allRes.rows.length} (sample shown above)`);
        allRes.rows.forEach(r => console.log(`  - ${r.date}: [${r.type}] [${r.item}]`));

        const res = await client.query(`SELECT date, type, value, item FROM fm_financial_statements WHERE stock_id = $1`, [symbol]);
        console.log(`🔍 [FinMind] Query returned ${res.rows.length} rows for ${symbol}`);

        if (res.rows.length === 0) {
            console.warn(`⚠️ [FinMind] No financial statement data found for ${symbol} in fm_financial_statements, cannot calculate ratios.`);
            return;
        }

        // Group by date
        const dataByDate = {};
        res.rows.forEach(r => {
            // Ensure date is a string in YYYY-MM-DD format
            const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
            if (!dataByDate[dateStr]) dataByDate[dateStr] = {};

            // r.type is the item name (Revenue, TotalAssets, etc.)
            // r.item is the category (Income Statement, Balance Sheet)
            if (r.type) dataByDate[dateStr][r.type] = parseFloat(r.value);
            // Also support localized names if they are in the 'item' column for older data
            if (r.item && r.item !== 'Income Statement' && r.item !== 'Balance Sheet') {
                dataByDate[dateStr][r.item] = parseFloat(r.value);
            }
        });

        let count = 0;
        const sortedDates = Object.keys(dataByDate).sort().reverse();
        if (sortedDates.length > 0) {
            const latestDate = sortedDates[0];
            console.log(`🔍 [FinMind] Latest date: ${latestDate}, keys count: ${Object.keys(dataByDate[latestDate]).length}`);
        }

        for (const [date, data] of Object.entries(dataByDate)) {
            // Support both English and Chinese keys for robustness
            const revenue = data['Revenue'] || data['營業收入'] || 0;
            const grossProfit = data['GrossProfit'] || data['營業毛利（毛損）'] || 0;
            const opIncome = data['OperatingIncome'] || data['營業利益（損失）'] || 0;
            const netIncome = data['NetIncome'] || data['IncomeAfterTaxes'] || data['本期淨利（淨損）'] || 0;
            const totalAssets = data['TotalAssets'] || data['資產總額'] || data['資產總計'] || 0;
            const equity = data['Equity'] || data['權益總額'] || data['權益總計'] || 0;

            const ratios = [];
            if (revenue > 0) {
                ratios.push({ item: 'GrossProfitMargin', value: (grossProfit / revenue) * 100 });
                ratios.push({ item: 'OperatingIncomeMargin', value: (opIncome / revenue) * 100 });
                ratios.push({ item: 'NetIncomeMargin', value: (netIncome / revenue) * 100 });
            }
            if (equity > 0) {
                ratios.push({ item: 'ROE', value: (netIncome / equity) * 100 });
            }
            if (totalAssets > 0) {
                ratios.push({ item: 'ROA', value: (netIncome / totalAssets) * 100 });
            }

            if (ratios.length > 0) {
                for (const r of ratios) {
                    await client.query(`
                        INSERT INTO fm_financial_statements (stock_id, date, type, value, item)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (stock_id, date, type, item) DO UPDATE SET
                            value = EXCLUDED.value
                    `, [symbol, date, 'Ratio', r.value, r.item]);
                }
                count++;
            }
        }
        console.log(`✅ [FinMind] Calculated and saved ratios for ${symbol} across ${count} periods.`);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to calculate ratios for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncDetailedFinancials(symbol) {
    const client = await pool.connect();
    try {
        console.log(`🔄 [FinMind] Syncing detailed financials (BS/IS/CF) for ${symbol}...`);

        // TaiwanStockFinancialStatements datasets:
        // - TaiwanStockFinancialStatements: Income Statement
        // - TaiwanStockBalanceSheet: Balance Sheet
        // - TaiwanStockCashFlowsStatement: Cash Flows
        const datasets = ['TaiwanStockFinancialStatements', 'TaiwanStockBalanceSheet', 'TaiwanStockCashFlowsStatement'];

        for (const dataset of datasets) {
            console.log(`  [FinMind] Fetching ${dataset}...`);
            const data = await fetchFinMind(dataset, symbol);
            if (data && data.length > 0) {
                for (const item of data) {
                    let category = 'Unknown';
                    if (dataset === 'TaiwanStockFinancialStatements') category = 'Income Statement';
                    if (dataset === 'TaiwanStockBalanceSheet') category = 'Balance Sheet';
                    if (dataset === 'TaiwanStockCashFlowsStatement') category = 'Cash Flows';

                    await client.query(`
                        INSERT INTO fm_financial_statements (stock_id, date, type, value, item)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (stock_id, date, type, item) DO UPDATE SET
                            value = EXCLUDED.value
                    `, [symbol, item.date, item.type || item.item, item.value, category]);

                    // Also update legacy tables
                    if (category === 'Balance Sheet') {
                        await client.query(`INSERT INTO fm_balance_sheet (stock_id, date, value, item) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [symbol, item.date, item.value, item.origin_name || item.type]).catch(e => { });
                    } else if (category === 'Income Statement') {
                        await client.query(`INSERT INTO fm_income_statement (stock_id, date, value, item) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [symbol, item.date, item.value, item.origin_name || item.type]).catch(e => { });
                    }
                }
                console.log(`✅ [FinMind] Synced ${dataset} for ${symbol}: ${data.length} items.`);
            }
            await updateProgress(dataset, symbol, data ? data.length : 0);
        }
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync detailed financials for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncStockFinancials(symbol) {
    const client = await pool.connect();
    try {
        console.log(`🔄 [FinMind] Syncing financials for ${symbol}...`);

        await syncDetailedFinancials(symbol);

        try {
            const dividends = await fetchFinMind('TaiwanStockDividend', symbol);
            for (const item of dividends) {
                const year = parseInt(item.year || item.Year || 0);
                if (year === 0) continue;
                const total = (parseFloat(item.CashEarningsDistribution || 0) + parseFloat(item.StockEarningsDistribution || 0));
                await client.query(`
                    INSERT INTO dividend_policy (symbol, year, cash_dividend, stock_dividend, total_dividend)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (symbol, year) 
                    DO UPDATE SET 
                        cash_dividend = EXCLUDED.cash_dividend,
                        stock_dividend = EXCLUDED.stock_dividend,
                        total_dividend = EXCLUDED.total_dividend
                `, [symbol, year, parseFloat(item.CashEarningsDistribution || 0), parseFloat(item.StockEarningsDistribution || 0), total]);
            }
        } catch (err) { }

        try {
            const divResults = await fetchFinMind('TaiwanStockDividendResult', symbol);
            for (const item of divResults) {
                await client.query(`
                    INSERT INTO fm_dividend_result (
                        stock_id, date, before_price, after_price, stock_and_cash_dividend, rate_of_return, cash_dividend, stock_dividend
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (stock_id, date) DO UPDATE SET
                        cash_dividend = EXCLUDED.cash_dividend,
                        stock_dividend = EXCLUDED.stock_dividend
                `, [
                    symbol, item.date, 
                    parseFloat(item.before_price || 0), parseFloat(item.after_price || 0),
                    parseFloat(item.stock_and_cash_dividend || 0), parseFloat(item.rate_of_return || 0),
                    parseFloat(item.cash_dividend || 0), parseFloat(item.stock_dividend || 0)
                ]);
            }
        } catch (err) { }

        // Sync PER/PBR/Yield
        try {
            const perData = await fetchFinMind('TaiwanStockPER', symbol);
            if (perData && perData.length > 0) {
                const latest = perData[perData.length - 1];
                await client.query(`
                    INSERT INTO fundamentals (symbol, trade_date, pe_ratio, pb_ratio, dividend_yield)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (symbol, trade_date) 
                    DO UPDATE SET 
                        pe_ratio = EXCLUDED.pe_ratio,
                        pb_ratio = EXCLUDED.pb_ratio,
                        dividend_yield = EXCLUDED.dividend_yield
                `, [symbol, latest.date, parseFloat(latest.PER) || 0, parseFloat(latest.PBR) || 0, parseFloat(latest.dividend_yield) || 0]);
                console.log(`✅ [FinMind] Updated fundamentals for ${symbol}`);
            }
            await updateProgress('TaiwanStockPER', symbol, data ? data.length : 0);
        } catch (err) {
            console.error(`❌ [FinMind] Failed to sync PER for ${symbol}:`, err.message);
        }

        // await syncBrokerTrading(symbol); // KEEP THIS (Unique)
        // await syncMarginTrading(symbol); // MOVED TO fetcher.js
        // await syncInstitutional(symbol); // MOVED TO fetcher.js
        // syncHoldingSharesPer and syncMonthlyRevenue have been separated into their own tasks
        await syncDetailedFinancials(symbol);
        await syncFinancialRatios(symbol);

        console.log(`✅ [FinMind] Synced ${symbol} successfully.`);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncStockPER(symbol, date) {
    const client = await pool.connect();
    try {
        const start_date = date || START_DATE;
        console.log(`🔄 [FinMind] Syncing PE/PB history for ${symbol} starting from ${start_date}...`);
        const data = await fetchFinMind('TaiwanStockPER', symbol, start_date);
        for (const item of data) {
            await client.query(`
                INSERT INTO fm_stock_per (stock_id, date, pe_ratio, pb_ratio, dividend_yield)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (stock_id, date) DO UPDATE SET
                    pe_ratio = EXCLUDED.pe_ratio,
                    pb_ratio = EXCLUDED.pb_ratio,
                    dividend_yield = EXCLUDED.dividend_yield
            `, [symbol, item.date, item.PER, item.PBR, item.dividend_yield]);
        }
        console.log(`✅ [FinMind] Synced PE/PB for ${symbol}: ${data.length} records.`);
        await updateProgress('TaiwanStockPER', symbol, data ? data.length : 0);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync PE/PB for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncAllStocksFinancials() {
    console.log(getTokenStatus());
    const res = await pool.query(`
        SELECT symbol FROM stocks 
        WHERE symbol ~ '^[0-9]{4}$'
        ORDER BY symbol ASC
    `);
    const stocks = res.rows;
    for (let i = 0; i < stocks.length; i++) {
        await syncStockFinancials(stocks[i].symbol);
        await sleep(6000);
    }
}

async function syncDailyBrokerAndPER() {
    console.log(`🚀 [FinMind] Starting daily data sync (Broker/PER)...`);
    console.log(getTokenStatus());
    const res = await pool.query(`
        SELECT symbol FROM stocks 
        WHERE symbol ~ '^[0-9]{4}$'
        ORDER BY symbol ASC
    `);
    const stocks = res.rows;
    for (let i = 0; i < stocks.length; i++) {
        const symbol = stocks[i].symbol;
        await syncBrokerTrading(symbol);
        await syncStockPER(symbol);
        // Faster sleep because we fetch fewer datasets per stock
        await sleep(2000); 
    }
    await updateProgress('FinMindDaily');
}

async function syncWeeklyHolding() {
    console.log(`🚀 [FinMind] Starting weekly holding shares sync...`);
    console.log(getTokenStatus());
    const res = await pool.query(`
        SELECT symbol FROM stocks 
        WHERE symbol ~ '^[0-9]{4}$'
        ORDER BY symbol ASC
    `);
    const stocks = res.rows;
    for (let i = 0; i < stocks.length; i++) {
        await syncHoldingSharesPer(stocks[i].symbol);
        await sleep(1500); 
    }
}

async function syncMonthlyRevenue(symbol) {
    const client = await pool.connect();
    try {
        console.log(`🔄 [FinMind] Syncing monthly revenue for ${symbol}...`);
        const revenues = await fetchFinMind('TaiwanStockMonthRevenue', symbol);
        for (const item of revenues) {
            await client.query(`
                INSERT INTO monthly_revenue (symbol, revenue_year, revenue_month, revenue)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (symbol, revenue_year, revenue_month) 
                DO UPDATE SET revenue = EXCLUDED.revenue
            `, [symbol, item.revenue_year, item.revenue_month, item.revenue]);
            
            // Also write to fm_month_revenue for the analyzer
            await client.query(`
                INSERT INTO fm_month_revenue (stock_id, date, country, revenue, revenue_month, revenue_year)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (stock_id, date) DO UPDATE SET
                    revenue = EXCLUDED.revenue
            `, [symbol, item.date, item.country, item.revenue, item.revenue_month, item.revenue_year]);
        }
        await updateProgress('TaiwanStockMonthRevenue', symbol, revenues ? revenues.length : 0);
        console.log(`✅ [FinMind] Synced monthly revenue for ${symbol}: ${revenues.length} records.`);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync monthly revenue for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncMonthlyRevenueBatch() {
    console.log(`🚀 [FinMind] Starting daily monthly-revenue batch sync...`);
    console.log(getTokenStatus());
    const res = await pool.query(`
        SELECT symbol FROM stocks 
        WHERE symbol ~ '^[0-9]{4}$'
        ORDER BY symbol ASC
    `);
    const stocks = res.rows;
    for (let i = 0; i < stocks.length; i++) {
        await syncMonthlyRevenue(stocks[i].symbol);
        await sleep(1500); 
    }
}

async function syncHoldingSharesPer(symbol, date) {
    const client = await pool.connect();
    try {
        const start_date = date || START_DATE;
        console.log(`🔄 [FinMind] Syncing shareholding distribution for ${symbol}...`);
        // TaiwanStockHoldingSharesPer might not support start_date in same way, try fetching without or with recent
        const data = await fetchFinMind('TaiwanStockHoldingSharesPer', symbol);
        
        let count = 0;
        for (const item of data) {
            await client.query(`
                INSERT INTO fm_holding_shares_per (stock_id, date, level, people, percent, unit)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (stock_id, date, level) DO UPDATE SET
                    people = EXCLUDED.people,
                    percent = EXCLUDED.percent,
                    unit = EXCLUDED.unit
            `, [symbol, item.date, item.HoldingSharesLevel, item.people, item.percent, item.unit]);
            count++;
        }
        console.log(`✅ [FinMind] Synced shareholding dist for ${symbol}: ${count} records.`);
        await updateProgress('TaiwanStockHoldingSharesPer', symbol, data ? data.length : 0);
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync shareholding dist for ${symbol}:`, err.message);
    } finally {
        client.release();
    }
}

async function syncTradingDate() {
    const ds = 'TaiwanStockTradingDate';
    console.log(`🔄 [FinMind] Syncing ${ds}...`);
    try {
        const data = await fetchFinMind(ds, '');
        if (data && data.length > 0) {
            const client = await pool.connect();
            try {
                let count = 0;
                await client.query('BEGIN');
                for (const item of data) {
                    await client.query(`
                        INSERT INTO trading_dates (date, description)
                        VALUES ($1, $2)
                        ON CONFLICT (date) DO UPDATE SET
                            description = EXCLUDED.description
                    `, [item.date, String(item.description || '').substring(0, 100)]);
                    count++;
                }
                await client.query('COMMIT');
                console.log(`✅ [FinMind] Synced ${ds}: ${count}/${data.length} records.`);
                await updateProgress(ds);
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync ${ds}:`, err.message);
    }
}

async function syncBrokers() {
    const ds = 'TaiwanSecuritiesTraderInfo';
    console.log(`🔄 [FinMind] Syncing ${ds}...`);
    try {
        const data = await fetchFinMind(ds, '');
        if (data && data.length > 0) {
            const client = await pool.connect();
            try {
                let count = 0;
                await client.query('BEGIN');
                for (const item of data) {
                    if (!item.broker_id) continue;
                    await client.query(`
                        INSERT INTO brokers (id, name, market)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            market = EXCLUDED.market
                    `, [item.broker_id, item.broker_name, item.market]);
                    count++;
                }
                await client.query('COMMIT');
                console.log(`✅ [FinMind] Synced ${ds}: ${count}/${data.length} records.`);
                await updateProgress(ds);
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }
    } catch (err) {
        console.error(`❌ [FinMind] Failed to sync ${ds}:`, err.message);
    }
}

module.exports = { 
    syncStockFinancials, 
    syncAllStocksFinancials, 
    syncBrokerTrading, 
    syncMarginTrading, 
    syncFinancialRatios, 
    syncDetailedFinancials, 
    syncStockPER,
    syncHoldingSharesPer,
    syncTradingDate,
    syncDailyBrokerAndPER,
    syncWeeklyHolding,
    syncMonthlyRevenueBatch,
    syncTotalInstitutional,
    syncTotalMargin,
    syncBrokers
};
