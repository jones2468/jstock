// 融資融券：TWSE 上市 + TPEX 上櫃
// TWSE OpenAPI 信用交易個股統計
// TPEX OpenAPI 上櫃融資融券餘額

const TWSE_MARGIN = "https://openapi.twse.com.tw/v1/exchangeReport/MI_MARGN";
const TPEX_MARGIN = "https://www.tpex.org.tw/openapi/v1/tpex_margin_balance";

export interface MarginRow {
  trade_date: string;
  stock_code: string;
  margin_buy: number | null;
  margin_sell: number | null;
  margin_redeem: number | null;
  margin_balance: number | null;
  margin_limit: number | null;
  short_sell: number | null;
  short_buy: number | null;
  short_redeem: number | null;
  short_balance: number | null;
  short_limit: number | null;
}

function parseInt0(s: unknown): number | null {
  if (s === null || s === undefined || s === "" || s === "--") return null;
  const n = parseInt(String(s).replace(/,/g, ""), 10);
  return isNaN(n) ? null : n;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchTWSEMargin(): Promise<MarginRow[]> {
  const res = await fetch(TWSE_MARGIN, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TWSE MI_MARGN: HTTP ${res.status}`);
  const raw = (await res.json()) as any[];
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const date = todayIso();

  return raw
    .filter((r) => r["股票代號"] || r.Code)
    .map((r) => {
      const code = (r["股票代號"] ?? r.Code ?? "").toString().trim();
      // TWSE MI_MARGN 中文欄位：融資買進、融資賣出、現金償還、前日餘額、今日餘額、限額
      // 同樣有融券：融券賣出、融券買進、現券償還、前日餘額、今日餘額、限額
      return {
        trade_date: date,
        stock_code: code,
        margin_buy: parseInt0(r["融資買進"] ?? r.MarginPurchase),
        margin_sell: parseInt0(r["融資賣出"] ?? r.MarginSale),
        margin_redeem: parseInt0(r["融資現金償還"] ?? r.MarginCashRepayment),
        margin_balance: parseInt0(r["融資今日餘額"] ?? r.MarginTodayBalance),
        margin_limit: parseInt0(r["融資限額"] ?? r.MarginQuota),
        short_sell: parseInt0(r["融券賣出"] ?? r.ShortCovering),
        short_buy: parseInt0(r["融券買進"] ?? r.ShortSale),
        short_redeem: parseInt0(r["融券現券償還"] ?? r.ShortStockRepayment),
        short_balance: parseInt0(r["融券今日餘額"] ?? r.ShortTodayBalance),
        short_limit: parseInt0(r["融券限額"] ?? r.ShortQuota),
      };
    })
    .filter((r) => r.stock_code);
}

export async function fetchTPEXMargin(): Promise<MarginRow[]> {
  const res = await fetch(TPEX_MARGIN, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TPEX margin: HTTP ${res.status}`);
  const raw = (await res.json()) as any[];
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const date = todayIso();

  return raw
    .filter((r) => r["代號"] || r.SecuritiesCompanyCode || r.Code)
    .map((r) => {
      const code = (r["代號"] ?? r.SecuritiesCompanyCode ?? r.Code ?? "")
        .toString()
        .trim();
      return {
        trade_date: date,
        stock_code: code,
        margin_buy: parseInt0(r["融資買進"]),
        margin_sell: parseInt0(r["融資賣出"]),
        margin_redeem: parseInt0(r["融資現金償還"]),
        margin_balance: parseInt0(r["融資今日餘額"]),
        margin_limit: parseInt0(r["融資限額"]),
        short_sell: parseInt0(r["融券賣出"]),
        short_buy: parseInt0(r["融券買進"]),
        short_redeem: parseInt0(r["融券現券償還"]),
        short_balance: parseInt0(r["融券今日餘額"]),
        short_limit: parseInt0(r["融券限額"]),
      };
    })
    .filter((r) => r.stock_code);
}
