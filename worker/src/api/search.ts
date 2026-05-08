import { Hono } from "hono";
import type { HonoEnv } from "../env";

export const searchRoutes = new Hono<HonoEnv>();

// 全域搜尋：同時搜 stocks 主檔 + etfs，前端 typeahead 用
searchRoutes.get("/", async (c) => {
  const q = c.req.query("q")?.trim();
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20", 10) || 20, 50);

  if (!q) return c.json({ ok: true, data: { stocks: [], etfs: [] } });

  const db = c.env.DB;
  const like = `%${q}%`;
  const prefix = `${q}%`;

  const [stocksRes, etfsRes] = await Promise.all([
    db
      .prepare(
        `SELECT stock_code AS code, stock_name AS name, market, industry
         FROM stocks
         WHERE stock_code LIKE ? OR stock_name LIKE ?
         ORDER BY
           CASE WHEN stock_code = ? THEN 0
                WHEN stock_code LIKE ? THEN 1
                ELSE 2 END,
           stock_code
         LIMIT ?`
      )
      .bind(like, like, q, prefix, limit)
      .all(),
    db
      .prepare(
        `SELECT etf_code AS code, etf_name AS name, issuer, etf_type, market
         FROM etfs
         WHERE etf_code LIKE ? OR etf_name LIKE ?
         ORDER BY
           CASE WHEN etf_code = ? THEN 0
                WHEN etf_code LIKE ? THEN 1
                ELSE 2 END,
           etf_code
         LIMIT ?`
      )
      .bind(like, like, q, prefix, limit)
      .all(),
  ]);

  return c.json({
    ok: true,
    data: {
      stocks: stocksRes.results,
      etfs: etfsRes.results,
    },
  });
});
