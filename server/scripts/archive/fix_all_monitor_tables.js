const { pool } = require('./server/db');

const sql = `
-- 1. fm_day_trading
CREATE TABLE IF NOT EXISTS public.fm_day_trading (
    stock_id character varying(10) NOT NULL,
    date date NOT NULL,
    buy_after_sell_volume bigint,
    buy_after_sell_amount bigint,
    sell_after_buy_volume bigint,
    sell_after_buy_amount bigint,
    day_trade_volume bigint,
    day_trade_amount bigint
);

-- 2. fm_total_institutional
CREATE TABLE IF NOT EXISTS public.fm_total_institutional (
    date date NOT NULL,
    name character varying(100) NOT NULL,
    buy bigint,
    sell bigint
);

-- 3. fm_total_margin
CREATE TABLE IF NOT EXISTS public.fm_total_margin (
    date date NOT NULL,
    name character varying(200) NOT NULL,
    margin_purchase_buy bigint,
    margin_purchase_sell bigint,
    margin_purchase_cash_repayment bigint,
    margin_purchase_yesterday_balance bigint,
    margin_purchase_today_balance bigint,
    short_sale_buy bigint,
    short_sale_sell bigint,
    short_sale_cash_repayment bigint,
    short_sale_yesterday_balance bigint,
    short_sale_today_balance bigint
);

-- 4. stock_health_scores
CREATE SEQUENCE IF NOT EXISTS public.stock_health_scores_id_seq;
CREATE TABLE IF NOT EXISTS public.stock_health_scores (
    id integer NOT NULL DEFAULT nextval('public.stock_health_scores_id_seq'::regclass),
    symbol character varying(20) NOT NULL,
    name character varying(100),
    industry character varying(100),
    market character varying(10),
    close_price numeric(12,2),
    change_percent numeric(8,4),
    overall_score integer DEFAULT 0,
    grade character varying(20),
    grade_color character varying(20),
    profit_score integer DEFAULT 0,
    growth_score integer DEFAULT 0,
    safety_score integer DEFAULT 0,
    value_score integer DEFAULT 0,
    chip_score integer DEFAULT 0,
    tech_score integer DEFAULT 0,
    sentiment_score integer DEFAULT 0,
    valuation_score integer DEFAULT 0,
    momentum_score integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    PRIMARY KEY (id)
);
ALTER SEQUENCE public.stock_health_scores_id_seq OWNED BY public.stock_health_scores.id;
`;

async function fix() {
  try {
    await pool.query(sql);
    console.log("All monitoring tables created/verified.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
fix();
