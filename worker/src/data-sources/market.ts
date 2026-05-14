/**
 * 大盤每日數據：加權指數 + 全市場成交金額 + 全市場融資融券餘額
 * 全部走 FinMind 以保持資料源一致。
 */

const FINMIND = "https://api.finmindtrade.com/api/v4/data";

interface TaiexRow {
  date: string;
  Trading_money: number;   // 全市場成交金額（元）
  open: number;
  max: number;
  min: number;
  close: number;           // 加權指數收盤
  spread: number;          // 漲跌點數
}

// FinMind 長格式：每日多筆，name 區分指標
interface MarginLongRow {
  date: string;
  name:
    | "MarginPurchase"      // 融資（張）
    | "ShortSale"           // 融券（張）
    | "MarginPurchaseMoney" // 融資金額（元）
    | string;
  TodayBalance: number;
}

interface MarginAggregated {
  date: string;
  margin_money: number | null;  // 融資餘額（元，會換算億）
  short_volume: number | null;  // 融券餘額（張）
}

export interface MarketDailyRow {
  trade_date: string;
  taiex_close: number | null;
  taiex_change: number | null;
  taiex_change_pct: number | null;
  total_volume_value: number | null;    // 億元
  total_margin_balance: number | null;  // 億元（融資金額）
  total_short_balance: number | null;   // 張（融券餘額）
}

async function fetchTaiex(startDate: string): Promise<TaiexRow[]> {
  const url = `${FINMIND}?dataset=TaiwanStockPrice&data_id=TAIEX&start_date=${startDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FinMind TAIEX HTTP ${res.status}`);
  const json = (await res.json()) as { status: number; data: TaiexRow[] };
  return json.data ?? [];
}

async function fetchTotalMargin(startDate: string): Promise<MarginAggregated[]> {
  const url = `${FINMIND}?dataset=TaiwanStockTotalMarginPurchaseShortSale&start_date=${startDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FinMind margin HTTP ${res.status}`);
  const json = (await res.json()) as { status: number; data: MarginLongRow[] };
  const byDate = new Map<string, { money: number | null; short: number | null }>();
  for (const r of json.data ?? []) {
    if (!byDate.has(r.date)) byDate.set(r.date, { money: null, short: null });
    const slot = byDate.get(r.date)!;
    if (r.name === "MarginPurchaseMoney") slot.money = r.TodayBalance;
    else if (r.name === "ShortSale") slot.short = r.TodayBalance;
  }
  return [...byDate.entries()].map(([date, v]) => ({
    date,
    margin_money: v.money,
    short_volume: v.short,
  }));
}

export async function fetchMarketDaily(startDate: string): Promise<MarketDailyRow[]> {
  const [taiex, margin] = await Promise.all([
    fetchTaiex(startDate),
    fetchTotalMargin(startDate),
  ]);

  const marginByDate = new Map(margin.map((r) => [r.date, r]));

  return taiex.map((t) => {
    const m = marginByDate.get(t.date);
    const change_pct =
      t.close && t.spread != null
        ? Math.round((t.spread / (t.close - t.spread)) * 10000) / 100
        : null;
    return {
      trade_date: t.date,
      taiex_close: t.close ?? null,
      taiex_change: t.spread ?? null,
      taiex_change_pct: change_pct,
      total_volume_value:
        t.Trading_money != null
          ? Math.round((t.Trading_money / 1e8) * 100) / 100  // 億元
          : null,
      total_margin_balance:
        m?.margin_money != null
          ? Math.round((m.margin_money / 1e8) * 100) / 100   // 億元
          : null,
      total_short_balance: m?.short_volume ?? null,           // 張
    };
  });
}
