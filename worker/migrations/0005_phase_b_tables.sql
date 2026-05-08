-- Phase B: 看盤軟體級資訊層
-- 三大法人買賣超 / 融資融券 / 月營收

-- 三大法人買賣超（每日，全市場）
CREATE TABLE IF NOT EXISTS daily_institutional (
    trade_date    TEXT NOT NULL,
    stock_code    TEXT NOT NULL,
    foreign_buy   INTEGER,
    foreign_sell  INTEGER,
    foreign_net   INTEGER,
    invest_buy    INTEGER,
    invest_sell   INTEGER,
    invest_net    INTEGER,
    dealer_buy    INTEGER,
    dealer_sell   INTEGER,
    dealer_net    INTEGER,
    total_net     INTEGER,
    PRIMARY KEY (trade_date, stock_code)
);
CREATE INDEX IF NOT EXISTS idx_inst_stock_date
  ON daily_institutional(stock_code, trade_date DESC);

-- 融資融券（每日，全市場）
CREATE TABLE IF NOT EXISTS daily_margin (
    trade_date     TEXT NOT NULL,
    stock_code     TEXT NOT NULL,
    margin_buy     INTEGER,
    margin_sell    INTEGER,
    margin_redeem  INTEGER,
    margin_balance INTEGER,
    margin_limit   INTEGER,
    short_sell     INTEGER,
    short_buy      INTEGER,
    short_redeem   INTEGER,
    short_balance  INTEGER,
    short_limit    INTEGER,
    PRIMARY KEY (trade_date, stock_code)
);
CREATE INDEX IF NOT EXISTS idx_margin_stock_date
  ON daily_margin(stock_code, trade_date DESC);

-- 月營收（公開資訊觀測站）
CREATE TABLE IF NOT EXISTS monthly_revenue (
    report_year   INTEGER NOT NULL,    -- 西元年
    report_month  INTEGER NOT NULL,    -- 1-12
    stock_code    TEXT NOT NULL,
    revenue       INTEGER,             -- 當月營收（千元）
    yoy_pct       REAL,                -- 去年同月增減%
    mom_pct       REAL,                -- 上月比較增減%
    ytd_revenue   INTEGER,             -- 累計營收（千元）
    ytd_yoy_pct   REAL,                -- 累計增減%
    PRIMARY KEY (report_year, report_month, stock_code)
);
CREATE INDEX IF NOT EXISTS idx_revenue_stock
  ON monthly_revenue(stock_code, report_year DESC, report_month DESC);
