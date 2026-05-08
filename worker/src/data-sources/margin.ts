// 融資融券：TWSE 上市 + TPEX 上櫃

const TWSE_MARGIN = "https://openapi.twse.com.tw/v1/exchangeReport/MI_MARGN";
const TPEX_MARGIN = "https://www.tpex.org.tw/www/zh-tw/margin/balance?response=json";

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

// TWSE: key-value JSON objects with Chinese field names
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

// TPEX: tables[0].fields + data (array-of-arrays)
// fields: [0]代號, [3]資買, [4]資賣, [5]現償, [6]資餘額, [9]資限額,
//         [11]券賣, [12]券買, [13]券償, [14]券餘額, [17]券限額
export async function fetchTPEXMargin(): Promise<MarginRow[]> {
  const res = await fetch(TPEX_MARGIN, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TPEX margin: HTTP ${res.status}`);
  const json = (await res.json()) as any;
  const table = json?.tables?.[0];
  if (!table || !Array.isArray(table.data)) return [];

  const date = todayIso();

  return table.data
    .filter((row: string[]) => row[0] && /^\d{4,6}/.test(row[0].trim()))
    .map((row: string[]) => ({
      trade_date: date,
      stock_code: row[0].trim(),
      margin_buy: parseInt0(row[3]),
      margin_sell: parseInt0(row[4]),
      margin_redeem: parseInt0(row[5]),
      margin_balance: parseInt0(row[6]),
      margin_limit: parseInt0(row[9]),
      short_sell: parseInt0(row[11]),
      short_buy: parseInt0(row[12]),
      short_redeem: parseInt0(row[13]),
      short_balance: parseInt0(row[14]),
      short_limit: parseInt0(row[17]),
    }))
    .filter((r: MarginRow) => r.stock_code);
}
