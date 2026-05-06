import { TWSE_STOCK_DAY_ALL } from "@jstock/shared";

export interface TWSERawRow {
  Date: string;
  Code: string;
  Name: string;
  TradeVolume: string;
  TradeValue: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
  ClosingPrice: string;
  Change: string;
  Transaction: string;
}

export interface StockPriceRow {
  price_date: string;
  stock_code: string;
  stock_name: string;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number;
  volume: number | null;
  change_val: number | null;
}

export async function fetchTWSEDayAll(): Promise<StockPriceRow[]> {
  const res = await fetch(TWSE_STOCK_DAY_ALL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TWSE API: HTTP ${res.status}`);

  const raw: TWSERawRow[] = await res.json();
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("TWSE API returned empty data");
  }

  return raw
    .filter((r) => r.Code && r.ClosingPrice && r.ClosingPrice !== "--")
    .map((r) => ({
      price_date: rocToIso(r.Date),
      stock_code: r.Code,
      stock_name: r.Name,
      open_price: parseNum(r.OpeningPrice),
      high_price: parseNum(r.HighestPrice),
      low_price: parseNum(r.LowestPrice),
      close_price: parseNum(r.ClosingPrice) ?? 0,
      volume: parseNum(r.TradeVolume),
      change_val: parseNum(r.Change),
    }));
}

function rocToIso(rocDate: string): string {
  const s = rocDate.replace(/\//g, "");
  const rocYear = parseInt(s.slice(0, -4), 10);
  const month = s.slice(-4, -2);
  const day = s.slice(-2);
  return `${rocYear + 1911}-${month}-${day}`;
}

function parseNum(s: string | undefined): number | null {
  if (!s || s === "--" || s === "") return null;
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}
