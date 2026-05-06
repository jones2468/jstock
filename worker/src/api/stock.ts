import { Hono } from "hono";
import type { HonoEnv } from "../env";

export const stockRoutes = new Hono<HonoEnv>();

stockRoutes.get("/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json({ ok: true, data: [] });

  const db = c.env.DB;
  const { results } = await db
    .prepare(
      `SELECT DISTINCT stock_code, stock_name
       FROM holdings_snapshots
       WHERE stock_code LIKE ? OR stock_name LIKE ?
       ORDER BY stock_code
       LIMIT 20`
    )
    .bind(`%${q}%`, `%${q}%`)
    .all();

  return c.json({ ok: true, data: results });
});

stockRoutes.get("/:code/etfs", async (c) => {
  const code = c.req.param("code");
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT h.etf_code, e.etf_name, h.weight_pct, h.shares,
              d.diff_type, d.weight_change
       FROM holdings_snapshots h
       JOIN etfs e ON e.etf_code = h.etf_code
       LEFT JOIN holdings_diffs d
         ON d.etf_code = h.etf_code
         AND d.stock_code = h.stock_code
         AND d.diff_date = h.snapshot_date
       WHERE h.stock_code = ? AND h.snapshot_date = ?
       ORDER BY h.weight_pct DESC`
    )
    .bind(code, date)
    .all();

  return c.json({ ok: true, data: results });
});

stockRoutes.post("/batch-prices", async (c) => {
  const body = await c.req.json<{ stocks: string[]; date?: string }>();
  if (!body.stocks?.length) return c.json({ ok: true, data: [] });

  const date = body.date ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const placeholders = body.stocks.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT stock_code, stock_name, close_price, change_val
       FROM stock_prices
       WHERE stock_code IN (${placeholders}) AND price_date = ?`
    )
    .bind(...body.stocks, date)
    .all();

  return c.json({ ok: true, data: results });
});
