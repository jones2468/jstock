import { Hono } from "hono";
import type { HonoEnv } from "../router";

export const overlapRoutes = new Hono<HonoEnv>();

overlapRoutes.get("/compare", async (c) => {
  const etfParam = c.req.query("etfs") ?? "";
  const etfCodes = etfParam.split(",").filter(Boolean);
  if (etfCodes.length < 2 || etfCodes.length > 4) {
    return c.json({ ok: false, error: "Provide 2-4 ETF codes" }, 400);
  }

  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const placeholders = etfCodes.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT stock_code, stock_name, etf_code, weight_pct
       FROM holdings_snapshots
       WHERE snapshot_date = ? AND etf_code IN (${placeholders})
       ORDER BY stock_code`
    )
    .bind(date, ...etfCodes)
    .all();

  const byStock = new Map<string, { stock_name: string; weights: Record<string, number> }>();
  for (const r of results as Array<{ stock_code: string; stock_name: string; etf_code: string; weight_pct: number }>) {
    if (!byStock.has(r.stock_code)) {
      byStock.set(r.stock_code, { stock_name: r.stock_name, weights: {} });
    }
    byStock.get(r.stock_code)!.weights[r.etf_code] = r.weight_pct;
  }

  const common = [...byStock.entries()]
    .filter(([, v]) => Object.keys(v.weights).length === etfCodes.length)
    .map(([stock_code, v]) => ({ stock_code, ...v }));

  return c.json({
    ok: true,
    data: {
      etf_codes: etfCodes,
      common_stocks: common,
      overlap_count: common.length,
    },
  });
});

overlapRoutes.get("/matrix", async (c) => {
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT a.etf_code as etf_a, b.etf_code as etf_b,
              COUNT(*) as overlap_count
       FROM holdings_snapshots a
       JOIN holdings_snapshots b
         ON a.stock_code = b.stock_code
         AND a.snapshot_date = b.snapshot_date
         AND a.etf_code < b.etf_code
       WHERE a.snapshot_date = ?
       GROUP BY a.etf_code, b.etf_code`
    )
    .bind(date)
    .all();

  return c.json({ ok: true, data: results });
});
