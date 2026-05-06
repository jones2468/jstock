import { Hono } from "hono";
import type { HonoEnv } from "../router";

export const radarRoutes = new Hono<HonoEnv>();

radarRoutes.get("/new", async (c) => {
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT stock_code, stock_name,
              GROUP_CONCAT(etf_code) as etf_codes,
              COUNT(*) as etf_count
       FROM holdings_diffs
       WHERE diff_date = ? AND diff_type = 'new'
       GROUP BY stock_code, stock_name
       ORDER BY etf_count DESC, stock_code`
    )
    .bind(date)
    .all();

  return c.json({ ok: true, data: results });
});

radarRoutes.get("/removed", async (c) => {
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT stock_code, stock_name,
              GROUP_CONCAT(etf_code) as etf_codes,
              COUNT(*) as etf_count
       FROM holdings_diffs
       WHERE diff_date = ? AND diff_type = 'removed'
       GROUP BY stock_code, stock_name
       ORDER BY etf_count DESC, stock_code`
    )
    .bind(date)
    .all();

  return c.json({ ok: true, data: results });
});

radarRoutes.get("/sync-add", async (c) => {
  const days = parseInt(c.req.query("days") ?? "5");
  const minEtfs = parseInt(c.req.query("min_etfs") ?? "2");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT stock_code, stock_name,
              COUNT(DISTINCT etf_code) as etf_count,
              GROUP_CONCAT(DISTINCT etf_code) as etf_codes
       FROM holdings_diffs
       WHERE diff_date >= date('now', '-' || ? || ' days')
         AND diff_type IN ('new', 'increased')
       GROUP BY stock_code, stock_name
       HAVING etf_count >= ?
       ORDER BY etf_count DESC`
    )
    .bind(days, minEtfs)
    .all();

  return c.json({ ok: true, data: results });
});

radarRoutes.get("/sync-reduce", async (c) => {
  const days = parseInt(c.req.query("days") ?? "5");
  const minEtfs = parseInt(c.req.query("min_etfs") ?? "2");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT stock_code, stock_name,
              COUNT(DISTINCT etf_code) as etf_count,
              GROUP_CONCAT(DISTINCT etf_code) as etf_codes
       FROM holdings_diffs
       WHERE diff_date >= date('now', '-' || ? || ' days')
         AND diff_type IN ('removed', 'decreased')
       GROUP BY stock_code, stock_name
       HAVING etf_count >= ?
       ORDER BY etf_count DESC`
    )
    .bind(days, minEtfs)
    .all();

  return c.json({ ok: true, data: results });
});
