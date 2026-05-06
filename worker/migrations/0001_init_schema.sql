-- jstock D1 schema — 主動式 ETF 每日自動監測系統

-- ETF 基本資料（19 檔主動式 ETF）
CREATE TABLE IF NOT EXISTS etfs (
    etf_code       TEXT PRIMARY KEY,
    etf_name       TEXT NOT NULL,
    issuer         TEXT NOT NULL,
    group_tag      TEXT NOT NULL DEFAULT 'tw',
    aum            REAL,
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 每日 ETF 持股快照
CREATE TABLE IF NOT EXISTS holdings_snapshots (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date  TEXT NOT NULL,
    etf_code       TEXT NOT NULL,
    stock_code     TEXT NOT NULL,
    stock_name     TEXT NOT NULL,
    weight_pct     REAL NOT NULL,
    shares         INTEGER,
    UNIQUE(snapshot_date, etf_code, stock_code)
);

-- 每日持股異動（新增/移除/加碼/減碼）
CREATE TABLE IF NOT EXISTS holdings_diffs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    diff_date      TEXT NOT NULL,
    etf_code       TEXT NOT NULL,
    stock_code     TEXT NOT NULL,
    stock_name     TEXT NOT NULL,
    diff_type      TEXT NOT NULL,
    today_weight   REAL,
    prev_weight    REAL,
    weight_change  REAL,
    today_shares   INTEGER,
    prev_shares    INTEGER,
    UNIQUE(diff_date, etf_code, stock_code)
);

-- 股價歷史（OHLCV）
CREATE TABLE IF NOT EXISTS stock_prices (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    price_date     TEXT NOT NULL,
    stock_code     TEXT NOT NULL,
    stock_name     TEXT,
    open_price     REAL,
    high_price     REAL,
    low_price      REAL,
    close_price    REAL NOT NULL,
    volume         INTEGER,
    change_val     REAL,
    UNIQUE(price_date, stock_code)
);

-- 排程執行紀錄
CREATE TABLE IF NOT EXISTS cron_runs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name       TEXT NOT NULL,
    run_date       TEXT NOT NULL,
    status         TEXT NOT NULL,
    etf_count      INTEGER,
    record_count   INTEGER,
    error_message  TEXT,
    started_at     TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at   TEXT
);

-- Indexes

CREATE INDEX IF NOT EXISTS idx_holdings_etf_date
  ON holdings_snapshots(etf_code, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_holdings_stock_date
  ON holdings_snapshots(stock_code, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_diffs_date
  ON holdings_diffs(diff_date);

CREATE INDEX IF NOT EXISTS idx_diffs_date_type
  ON holdings_diffs(diff_date, diff_type);

CREATE INDEX IF NOT EXISTS idx_diffs_etf_date
  ON holdings_diffs(etf_code, diff_date);

CREATE INDEX IF NOT EXISTS idx_prices_stock_date
  ON stock_prices(stock_code, price_date);

CREATE INDEX IF NOT EXISTS idx_cron_job_date
  ON cron_runs(job_name, run_date DESC);
