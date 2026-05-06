import { Hono } from "hono";
import type { HonoEnv } from "../env";

export const holdingsRoutes = new Hono<HonoEnv>();

holdingsRoutes.get("/:code", async (c) => {
  const code = c.req.param("code");
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT * FROM holdings_snapshots
       WHERE etf_code = ? AND snapshot_date = ?
       ORDER BY weight_pct DESC`
    )
    .bind(code, date)
    .all();

  return c.json({ ok: true, data: results });
});

holdingsRoutes.get("/:code/diffs", async (c) => {
  const code = c.req.param("code");
  const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT * FROM holdings_diffs
       WHERE etf_code = ? AND diff_date = ?
       ORDER BY
         CASE diff_type
           WHEN 'new' THEN 1
           WHEN 'removed' THEN 2
           WHEN 'increased' THEN 3
           WHEN 'decreased' THEN 4
         END`
    )
    .bind(code, date)
    .all();

  return c.json({ ok: true, data: results });
});
