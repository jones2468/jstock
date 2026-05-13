-- Phase C: Quarterly EPS + Financial Summary
-- Source: MOPS 公開資訊觀測站 — 每季財報

CREATE TABLE IF NOT EXISTS quarterly_eps (
    stock_code      TEXT NOT NULL,
    report_year     INTEGER NOT NULL,     -- 西元年 (e.g., 2025)
    report_quarter  INTEGER NOT NULL,     -- 1-4
    eps             REAL,                 -- 基本每股盈餘 (元)
    revenue         INTEGER,              -- 營業收入 (千元)
    operating_income INTEGER,             -- 營業利益 (千元)
    pre_tax_income  INTEGER,              -- 稅前純益 (千元)
    net_income      INTEGER,              -- 本期淨利 (千元)
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (stock_code, report_year, report_quarter)
);

CREATE INDEX IF NOT EXISTS idx_eps_stock
  ON quarterly_eps(stock_code, report_year DESC, report_quarter DESC);

CREATE INDEX IF NOT EXISTS idx_eps_year_quarter
  ON quarterly_eps(report_year, report_quarter);
