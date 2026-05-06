export const MONEYDJ_HOLDINGS_URL = (code: string) =>
  `https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid=${code}.TW`;

export const TWSE_STOCK_DAY_ALL =
  "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";

export const TWSE_BWIBBU_ALL =
  "https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL";

export const FINMIND_API = "https://api.finmindtrade.com/api/v4/data";

export const DATA_RETENTION_DAYS = 90;

export const CRON_JOBS = {
  SCRAPE_HOLDINGS: "scrape_holdings",
  FETCH_PRICES: "fetch_prices",
  COMPUTE_DIFFS: "compute_diffs",
  CLEANUP: "cleanup",
} as const;
