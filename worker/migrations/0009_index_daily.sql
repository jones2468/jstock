-- 四大指數每日收盤（加權 / 櫃買 / 半導體 / 金融保險）
CREATE TABLE IF NOT EXISTS index_daily (
  index_code TEXT NOT NULL,   -- 'TAIEX' | 'TPEX' | 'SEMI' | 'FINANCE'
  trade_date TEXT NOT NULL,
  close_price REAL,
  change_val  REAL,
  change_pct  REAL,
  created_at  INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (index_code, trade_date)
);
