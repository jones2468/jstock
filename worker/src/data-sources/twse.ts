import { TWSE_STOCK_DAY_ALL, TWSE_STOCK_DAY, TPEX_STOCK_DAY } from "@jstock/shared";

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

export async function fetchStockHistory(
  stockCode: string,
  months: number = 12
): Promise<StockPriceRow[]> {
  const all: StockPriceRow[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rows = await fetchTWSEMonth(stockCode, d);
    if (rows.length > 0) {
      all.push(...rows);
    } else {
      const tpexRows = await fetchTPEXMonth(stockCode, d);
      all.push(...tpexRows);
      if (i === 0 && tpexRows.length === 0) continue;
    }
    if (i < months - 1) await sleep(350);
  }

  all.sort((a, b) => a.price_date.localeCompare(b.price_date));
  return all;
}

async function fetchTWSEMonth(
  code: string,
  date: Date
): Promise<StockPriceRow[]> {
  const dateStr =
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}01`;
  const url = TWSE_STOCK_DAY(code, dateStr);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    if (json.stat !== "OK" || !json.data?.length) return [];

    return json.data.map((row: string[]) => ({
      price_date: rocToIso(row[0]),
      stock_code: code,
      stock_name: json.title?.split(" ")[2] ?? "",
      open_price: parseNum(row[3]),
      high_price: parseNum(row[4]),
      low_price: parseNum(row[5]),
      close_price: parseNum(row[6]) ?? 0,
      volume: parseNum(row[1]),
      change_val: parseNum(row[7]),
    }));
  } catch {
    return [];
  }
}

async function fetchTPEXMonth(
  code: string,
  date: Date
): Promise<StockPriceRow[]> {
  const rocYear = date.getFullYear() - 1911;
  const rocYM = `${rocYear}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  const url = TPEX_STOCK_DAY(code, rocYM);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    if (!json.aaData?.length) return [];

    return json.aaData.map((row: string[]) => ({
      price_date: rocToIso(row[0]),
      stock_code: code,
      stock_name: json.stkName ?? "",
      open_price: parseNum(row[3]),
      high_price: parseNum(row[4]),
      low_price: parseNum(row[5]),
      close_price: parseNum(row[6]) ?? 0,
      volume: tpexVolume(row[1]),
      change_val: parseNum(row[7]),
    }));
  } catch {
    return [];
  }
}

function tpexVolume(s: string): number | null {
  const n = parseNum(s);
  return n !== null ? n * 1000 : null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
