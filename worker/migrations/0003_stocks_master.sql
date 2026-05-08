-- Phase A: 全台股主檔 + ETF 表擴欄
-- 從「只追 19 檔主動 ETF」擴展為「全市場可搜尋，watchlist 按需載入」

CREATE TABLE IF NOT EXISTS stocks (
    stock_code   TEXT PRIMARY KEY,
    stock_name   TEXT NOT NULL,
    market       TEXT NOT NULL,            -- 'TWSE' (上市) | 'TPEX' (上櫃)
    industry     TEXT,                     -- 產業別
    isin         TEXT,                     -- ISIN 國際證券識別碼
    listed_date  TEXT,                     -- 上市/上櫃日 (YYYY-MM-DD)
    cfi_code     TEXT,                     -- CFICode（區分股票/ETF/權證等）
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stocks_name   ON stocks(stock_name);
CREATE INDEX IF NOT EXISTS idx_stocks_market ON stocks(market);

-- ETF 表擴欄
ALTER TABLE etfs ADD COLUMN etf_type    TEXT NOT NULL DEFAULT 'active';
ALTER TABLE etfs ADD COLUMN tracking    TEXT;
ALTER TABLE etfs ADD COLUMN listed_date TEXT;
ALTER TABLE etfs ADD COLUMN market      TEXT NOT NULL DEFAULT 'TWSE';
