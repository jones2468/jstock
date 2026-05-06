import { Hono } from "hono";
import type { HonoEnv } from "../env";

export const etfRoutes = new Hono<HonoEnv>();

etfRoutes.get("/", async (c) => {
  const db = c.env.DB;
  const group = c.req.query("group");

  let query = "SELECT * FROM etfs";
  const binds: string[] = [];

  if (group) {
    query += " WHERE group_tag = ?";
    binds.push(group);
  }
  query += " ORDER BY etf_code";

  const stmt = binds.length
    ? db.prepare(query).bind(...binds)
    : db.prepare(query);

  const { results } = await stmt.all();
  return c.json({ ok: true, data: results });
});

etfRoutes.get("/:code", async (c) => {
  const code = c.req.param("code");
  const db = c.env.DB;
  const row = await db
    .prepare("SELECT * FROM etfs WHERE etf_code = ?")
    .bind(code)
    .first();
  if (!row) return c.json({ ok: false, error: "ETF not found" }, 404);
  return c.json({ ok: true, data: row });
});
