// 三大法人買賣超：TWSE 上市 + TPEX 上櫃
// TWSE OpenAPI 回傳當日全市場 JSON 陣列；TPEX 同樣

const TWSE_T86 = "https://openapi.twse.com.tw/v1/fund/T86";
const TPEX_T86 = "https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading";

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

// 取最近交易日（今日，若回傳空則往前一天）
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchTWSEInstitutional(): Promise<InstitutionalRow[]> {
  const res = await fetch(TWSE_T86, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TWSE T86: HTTP ${res.status}`);
  const raw = (await res.json()) as any[];
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const date = todayIso();

  return raw
    .filter((r) => r["證券代號"] || r.Code)
    .map((r) => {
      const code = (r["證券代號"] ?? r.Code ?? "").toString().trim();
      // TWSE 欄位名稱中文版：外陸資買進股數(不含外資自營商) / 外陸資賣出股數... / 外陸資買賣超股數
      const fb = parseInt0(r["外陸資買進股數(不含外資自營商)"] ?? r.ForeignInvestor_Bought);
      const fs = parseInt0(r["外陸資賣出股數(不含外資自營商)"] ?? r.ForeignInvestor_Sold);
      const fn = parseInt0(r["外陸資買賣超股數(不含外資自營商)"] ?? r.ForeignInvestor_NetBuySell);
      const ib = parseInt0(r["投信買進股數"] ?? r.TrustBought);
      const is = parseInt0(r["投信賣出股數"] ?? r.TrustSold);
      const ineta = parseInt0(r["投信買賣超股數"] ?? r.TrustNetBuySell);
      // 自營商分自行買賣 + 避險，這裡合併
      const db1 = parseInt0(r["自營商買進股數(自行買賣)"]);
      const db2 = parseInt0(r["自營商買進股數(避險)"]);
      const ds1 = parseInt0(r["自營商賣出股數(自行買賣)"]);
      const ds2 = parseInt0(r["自營商賣出股數(避險)"]);
      const dn1 = parseInt0(r["自營商買賣超股數(自行買賣)"]);
      const dn2 = parseInt0(r["自營商買賣超股數(避險)"]);
      const dealerBuy = sumNullable(db1, db2);
      const dealerSell = sumNullable(ds1, ds2);
      const dealerNet = sumNullable(dn1, dn2);
      const totalNet = parseInt0(r["三大法人買賣超股數"] ?? r.TotalNetBuySell);

      return {
        trade_date: date,
        stock_code: code,
        foreign_buy: fb,
        foreign_sell: fs,
        foreign_net: fn,
        invest_buy: ib,
        invest_sell: is,
        invest_net: ineta,
        dealer_buy: dealerBuy,
        dealer_sell: dealerSell,
        dealer_net: dealerNet,
        total_net: totalNet,
      };
    })
    .filter((r) => r.stock_code);
}

export async function fetchTPEXInstitutional(): Promise<InstitutionalRow[]> {
  const res = await fetch(TPEX_T86, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TPEX 3insti: HTTP ${res.status}`);
  const raw = (await res.json()) as any[];
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const date = todayIso();

  return raw
    .filter((r) => r["代號"] || r.SecuritiesCompanyCode || r.Code)
    .map((r) => {
      const code = (r["代號"] ?? r.SecuritiesCompanyCode ?? r.Code ?? "")
        .toString()
        .trim();
      const fb = parseInt0(r["外資及陸資(不含自營商)買進股數"]);
      const fs = parseInt0(r["外資及陸資(不含自營商)賣出股數"]);
      const fn = parseInt0(r["外資及陸資(不含自營商)買賣超股數"]);
      const ib = parseInt0(r["投信買進股數"]);
      const is_ = parseInt0(r["投信賣出股數"]);
      const ineta = parseInt0(r["投信買賣超股數"]);
      const db1 = parseInt0(r["自營商(自行買賣)買進股數"]);
      const db2 = parseInt0(r["自營商(避險)買進股數"]);
      const ds1 = parseInt0(r["自營商(自行買賣)賣出股數"]);
      const ds2 = parseInt0(r["自營商(避險)賣出股數"]);
      const dn1 = parseInt0(r["自營商(自行買賣)買賣超股數"]);
      const dn2 = parseInt0(r["自營商(避險)買賣超股數"]);
      const totalNet = parseInt0(r["三大法人買賣超股數合計"]);

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
        dealer_net: sumNullable(dn1, dn2),
        total_net: totalNet,
      };
    })
    .filter((r) => r.stock_code);
}

function sumNullable(...vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null);
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
}
