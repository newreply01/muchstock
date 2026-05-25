const { Pool } = require('pg');

const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'stock_screener', password: 'postgres123', port: 5533 });

async function debug() {
  const sym = '2330';
  const latestDate = '2026-03-23';
  const sql = `
                WITH latest_price AS (
                    SELECT close_price, change_percent 
                    FROM daily_prices 
                    WHERE symbol = $1 
                    ORDER BY trade_date DESC LIMIT 1
                )
                SELECT 
                    s.symbol, s.name, s.industry, s.market,
                    COALESCE(p.close_price, s.close_price)::numeric as "closePrice",
                    COALESCE(p.change_percent, s.change_percent)::numeric as "changePercent",
                    s.pe, s.pb, 
                    s.dividend_yield as "dividendYield",
                    s.roe, s.gross_margin as "grossMargin",
                    s.revenue_growth as "revenueGrowth",
                    s.avg_cash_dividend as "avgCashDividend",
                    s.inst_net_buy as "instNetBuy5d"
                FROM stock_health_scores s
                LEFT JOIN latest_price p ON true
                WHERE s.symbol = $1 AND s.calc_date = $2
                ORDER BY s.calc_date DESC LIMIT 1
  `;
  try {
    const res = await pool.query(sql, [sym, latestDate]);
    console.log('Result for 2330:');
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
  await pool.end();
}
debug();
