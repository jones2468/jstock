import { Hono } from "hono";
import type { HonoEnv } from "../env";

export const watchlistRoutes = new Hono<HonoEnv>();

interface PriceRow {
  stock_code: string;
  stock_name: string | null;
  close_price: number;
  change_val: number | null;
  price_date: string;
}

interface EPSRow {
  stock_code: string;
  report_year: number;
  report_quarter: number;
  eps: number;
}

interface InstRow {
  stock_code: string;
  net5d: number | null;
}

export interface DashboardRow {
  stock_code: string;
  stock_name: string | null;
  current_price: number | null;
  change_val: number | null;
  price_date: string | null;
  trailing_eps: number | null;
  trailing_pe: number | null;
  institutional_net_5d: number | null;
  etf_count: number;
  etf_add_14d: number;
  etf_remove_14d: number;
}

watchlistRoutes.post("/dashboard", async (c) => {
  const body = await c.req.json<{ codes: string[] }>();
  const codes = [...new Set(body.codes ?? [])].filter(Boolean);
  if (codes.length === 0) return c.json({ ok: true, data: [] });

  const db = c.env.DB;
  const ph = codes.map(() => "?").join(",");

  // Query 1: latest price per stock (with name + change_val)
  const { results: prices } = await db
    .prepare(
      `SELECT p.stock_code, p.stock_name, p.close_price, p.change_val, p.price_date
       FROM stock_prices p
       INNER JOIN (
         SELECT stock_code, MAX(price_date) AS max_date
         FROM stock_prices
         WHERE stock_code IN (${ph})
         GROUP BY stock_code
       ) m ON p.stock_code = m.stock_code AND p.price_date = m.max_date`
    )
    .bind(...codes)
    .all<PriceRow>();

  // Query 2: top 4 quarters of EPS per stock (use ROW_NUMBER via correlated subquery)
  // SQLite supports window functions in D1.
  const { results: epsRows } = await db
    .prepare(
      `SELECT stock_code, report_year, report_quarter, eps FROM (
         SELECT stock_code, report_year, report_quarter, eps,
                ROW_NUMBER() OVER (
                  PARTITION BY stock_code
                  ORDER BY report_year DESC, report_quarter DESC
                ) AS rn
         FROM quarterly_eps
         WHERE stock_code IN (${ph}) AND eps IS NOT NULL
       ) WHERE rn <= 4`
    )
    .bind(...codes)
    .all<EPSRow>();

  // Query 3: institutional 5-day net per stock
  const { results: instRows } = await db
    .prepare(
      `SELECT stock_code, SUM(total_net) AS net5d FROM (
         SELECT stock_code, total_net,
                ROW_NUMBER() OVER (
                  PARTITION BY stock_code
                  ORDER BY trade_date DESC
                ) AS rn
         FROM daily_institutional
         WHERE stock_code IN (${ph})
       ) WHERE rn <= 5
       GROUP BY stock_code`
    )
    .bind(...codes)
    .all<InstRow>();

  // Query 4a: ETF holdings count (each ETF's own latest snapshot)
  const { results: cntRows } = await db
    .prepare(
      `SELECT h.stock_code, COUNT(DISTINCT h.etf_code) AS etf_count
       FROM holdings_snapshots h
       INNER JOIN (
         SELECT etf_code, MAX(snapshot_date) AS max_date
         FROM holdings_snapshots
         GROUP BY etf_code
       ) m ON h.etf_code = m.etf_code AND h.snapshot_date = m.max_date
       WHERE h.stock_code IN (${ph})
       GROUP BY h.stock_code`
    )
    .bind(...codes)
    .all<{ stock_code: string; etf_count: number }>();

  // Query 4b: 14-day adds
  const { results: addRows } = await db
    .prepare(
      `SELECT stock_code, COUNT(*) AS cnt
       FROM holdings_diffs
       WHERE diff_type = 'new'
         AND diff_date >= date('now', '-14 days')
         AND stock_code IN (${ph})
       GROUP BY stock_code`
    )
    .bind(...codes)
    .all<{ stock_code: string; cnt: number }>();

  // Query 4c: 14-day removes
  const { results: rmRows } = await db
    .prepare(
      `SELECT stock_code, COUNT(*) AS cnt
       FROM holdings_diffs
       WHERE diff_type = 'removed'
         AND diff_date >= date('now', '-14 days')
         AND stock_code IN (${ph})
       GROUP BY stock_code`
    )
    .bind(...codes)
    .all<{ stock_code: string; cnt: number }>();

  // Aggregate
  const priceMap = new Map(prices.map((p) => [p.stock_code, p]));
  const epsByStock = new Map<string, EPSRow[]>();
  for (const r of epsRows) {
    if (!epsByStock.has(r.stock_code)) epsByStock.set(r.stock_code, []);
    epsByStock.get(r.stock_code)!.push(r);
  }
  const instMap = new Map(instRows.map((r) => [r.stock_code, r.net5d]));
  const cntMap = new Map(cntRows.map((r) => [r.stock_code, r.etf_count]));
  const addMap = new Map(addRows.map((r) => [r.stock_code, r.cnt]));
  const rmMap = new Map(rmRows.map((r) => [r.stock_code, r.cnt]));

  const result: DashboardRow[] = codes.map((code) => {
    const price = priceMap.get(code);
    const eps4 = epsByStock.get(code) ?? [];
    const trailing_eps =
      eps4.length === 4
        ? Math.round(eps4.reduce((s, r) => s + r.eps, 0) * 100) / 100
        : null;
    const trailing_pe =
      trailing_eps && trailing_eps > 0 && price
        ? Math.round((price.close_price / trailing_eps) * 100) / 100
        : null;
    return {
      stock_code: code,
      stock_name: price?.stock_name ?? null,
      current_price: price?.close_price ?? null,
      change_val: price?.change_val ?? null,
      price_date: price?.price_date ?? null,
      trailing_eps,
      trailing_pe,
      institutional_net_5d: instMap.get(code) ?? null,
      etf_count: cntMap.get(code) ?? 0,
      etf_add_14d: addMap.get(code) ?? 0,
      etf_remove_14d: rmMap.get(code) ?? 0,
    };
  });

  return c.json({ ok: true, data: result });
});
