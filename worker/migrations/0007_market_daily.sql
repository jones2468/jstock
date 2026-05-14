-- Phase 4：大盤每日數據（加權指數 + 全市場成交量 + 全市場融資餘額）
CREATE TABLE IF NOT EXISTS market_daily (
  trade_date            TEXT PRIMARY KEY,           -- YYYY-MM-DD
  taiex_close           REAL,                       -- 加權指數收盤
  taiex_change          REAL,                       -- 漲跌點數
  taiex_change_pct      REAL,                       -- 漲跌幅
  total_volume_value    REAL,                       -- 全市場成交金額（億元）
  total_margin_balance  REAL,                       -- 全市場融資餘額（千元）
  total_short_balance   REAL,                       -- 全市場融券餘額（張）
  created_at            INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_market_daily_date ON market_daily(trade_date DESC);
