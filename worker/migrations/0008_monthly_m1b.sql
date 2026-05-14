-- M1B 月資料（央行貨幣總計數，via FRED API）
CREATE TABLE IF NOT EXISTS monthly_m1b (
  report_date   TEXT PRIMARY KEY,    -- YYYY-MM-01（月份第一天）
  m1b           REAL,                -- M1B 金額（百萬元新台幣）
  m2            REAL,                -- M2 金額（百萬元新台幣）
  m1b_yoy_pct   REAL,               -- M1B 年增率 %
  created_at    INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_monthly_m1b_date ON monthly_m1b(report_date DESC);
