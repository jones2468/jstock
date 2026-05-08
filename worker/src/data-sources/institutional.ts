// 三大法人買賣超：TWSE 上市 + TPEX 上櫃

const TWSE_T86 = "https://www.twse.com.tw/rwd/zh/fund/T86?response=json&selectType=ALL";
const TPEX_3INSTI = "https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading";

export interface InstitutionalRow {
  trade_date: string;
  stock_code: string;
  foreign_buy: number | null;
  foreign_sell: number | null;
  foreign_net: number | null;
  invest_buy: number | null;
  invest_sell: number | null;
  invest_net: number | null;
  dealer_buy: number | null;
  dealer_sell: number | null;
  dealer_net: number | null;
  total_net: number | null;
}

function parseInt0(s: unknown): number | null {
  if (s === null || s === undefined || s === "" || s === "--") return null;
  const n = parseInt(String(s).replace(/,/g, ""), 10);
  return isNaN(n) ? null : n;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumNullable(...vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null);
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
}

// TWSE: fields + data (array-of-arrays) format
// fields[0]=證券代號, [2]=外陸資買進(不含外資自營商), [3]=賣出, [4]=買賣超,
// [8]=投信買進, [9]=投信賣出, [10]=投信買賣超,
// [12]=自營商買進(自行買賣), [13]=賣出(自行買賣), [15]=買進(避險), [16]=賣出(避險),
// [18]=三大法人買賣超
export async function fetchTWSEInstitutional(): Promise<InstitutionalRow[]> {
  const res = await fetch(TWSE_T86, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TWSE T86: HTTP ${res.status}`);
  const json = (await res.json()) as any;
  if (json.stat !== "OK" || !Array.isArray(json.data)) return [];

  const date = todayIso();

  return json.data
    .filter((row: string[]) => row[0] && /^\d{4,6}/.test(row[0].trim()))
    .map((row: string[]) => {
      const code = row[0].trim();
      const fb = parseInt0(row[2]);
      const fs = parseInt0(row[3]);
      const fn = parseInt0(row[4]);
      const ib = parseInt0(row[8]);
      const is_ = parseInt0(row[9]);
      const ineta = parseInt0(row[10]);
      const db1 = parseInt0(row[12]); // 自行買賣 買進
      const ds1 = parseInt0(row[13]); // 自行買賣 賣出
      const db2 = parseInt0(row[15]); // 避險 買進
      const ds2 = parseInt0(row[16]); // 避險 賣出
      const totalNet = parseInt0(row[18]);

      return {
        trade_date: date,
        stock_code: code,
        foreign_buy: fb,
        foreign_sell: fs,
        foreign_net: fn,
        invest_buy: ib,
        invest_sell: is_,
        invest_net: ineta,
        dealer_buy: sumNullable(db1, db2),
        dealer_sell: sumNullable(ds1, ds2),
        dealer_net: sumNullable(parseInt0(row[14]), parseInt0(row[17])),
        total_net: totalNet,
      };
    })
    .filter((r: InstitutionalRow) => r.stock_code);
}

// TPEX: key-value JSON objects with English field names
export async function fetchTPEXInstitutional(): Promise<InstitutionalRow[]> {
  const res = await fetch(TPEX_3INSTI, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TPEX 3insti: HTTP ${res.status}`);
  const raw = (await res.json()) as any[];
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const date = todayIso();

  return raw
    .filter((r) => r.SecuritiesCompanyCode && /^\d{4,6}/.test(r.SecuritiesCompanyCode.trim()))
    .map((r) => {
      const code = r.SecuritiesCompanyCode.trim();
      const v = (key: string) => parseInt0(r[key]);

      return {
        trade_date: date,
        stock_code: code,
        foreign_buy: v("ForeignInvestorsIncludeMainlandAreaInvestors-TotalBuy"),
        foreign_sell: v("ForeignInvestorsIncludeMainlandAreaInvestors-TotalSell"),
        foreign_net: v("ForeignInvestorsIncludeMainlandAreaInvestors-Difference"),
        invest_buy: v("SecuritiesInvestmentTrustCompanies-TotalBuy"),
        invest_sell: v("SecuritiesInvestmentTrustCompanies-TotalSell"),
        invest_net: v("SecuritiesInvestmentTrustCompanies-Difference"),
        dealer_buy: v("Dealers-TotalBuy"),
        dealer_sell: v("Dealers-TotalSell"),
        dealer_net: v("Dealers-Difference"),
        total_net: v("TotalDifference"),
      };
    })
    .filter((r) => r.stock_code);
}
