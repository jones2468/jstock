import { Hono } from "hono";
import type { HonoEnv } from "../router";

export const etfRoutes = new Hono<HonoEnv>();

etfRoutes.get("/", async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare("SELECT * FROM etfs ORDER BY etf_code")
    .all();
  return c.json({ ok: true, data: results });
});

etfRoutes.get("/:code", async (c) => {
  const code = c.req.param("code");
  const row = await db(c)
    .prepare("SELECT * FROM etfs WHERE etf_code = ?")
    .bind(code)
    .first();
  if (!row) return c.json({ ok: false, error: "ETF not found" }, 404);
  return c.json({ ok: true, data: row });
});

function db(c: { env: { DB: D1Database } }) {
  return c.env.DB;
}
