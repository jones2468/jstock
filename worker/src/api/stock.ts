import { Hono } from "hono";
import type { HonoEnv } from "../env";
import { ensureHistoricalData } from "../utils/backfill";

export const stockRoutes = new Hono<HonoEnv>();

stockRoutes.get("/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json({ ok: true, data: [] });

  const db = c.env.DB;
  const like = `%${q}%`;

  // 優先：stocks 主檔；fallback：holdings_snapshots（為了向下相容尚未 seed 的環境）
  const { results } = await db
    .prepare(
      `SELECT stock_code, stock_name, market, industry
       FROM stocks
       WHERE stock_code LIKE ? OR stock_name LIKE ?
       ORDER BY
         CASE WHEN stock_code = ? THEN 0
              WHEN stock_code LIKE ? THEN 1
              ELSE 2 END,
         stock_code
       LIMIT 30`
    )
    .bind(like, like, q, `${q}%`)
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

// 加入 watchlist 時觸發：確保 stock_prices 已有最近 1 年資料；冪等
stockRoutes.post("/:code/backfill", async (c) => {
  const code = c.req.param("code");
  const start = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const db = c.env.DB;

  await ensureHistoricalData(db, code, start);

  const earliest = await db
    .prepare(`SELECT MIN(price_date) as d, COUNT(*) as n FROM stock_prices WHERE stock_code = ?`)
    .bind(code)
    .first<{ d: string | null; n: number }>();

  return c.json({
    ok: true,
    data: { earliest: earliest?.d, rows: earliest?.n ?? 0 },
  });
});

// 三大法人買賣超（最近 N 日）
stockRoutes.get("/:code/institutional", async (c) => {
  const code = c.req.param("code");
  const days = Math.min(parseInt(c.req.query("days") ?? "60", 10) || 60, 365);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT trade_date,
              foreign_buy, foreign_sell, foreign_net,
              invest_buy, invest_sell, invest_net,
              dealer_buy, dealer_sell, dealer_net,
              total_net
       FROM daily_institutional
       WHERE stock_code = ?
       ORDER BY trade_date DESC
       LIMIT ?`
    )
    .bind(code, days)
    .all();

  return c.json({ ok: true, data: results });
});

// 融資融券（最近 N 日）
stockRoutes.get("/:code/margin", async (c) => {
  const code = c.req.param("code");
  const days = Math.min(parseInt(c.req.query("days") ?? "60", 10) || 60, 365);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT trade_date,
              margin_buy, margin_sell, margin_redeem, margin_balance, margin_limit,
              short_sell, short_buy, short_redeem, short_balance, short_limit
       FROM daily_margin
       WHERE stock_code = ?
       ORDER BY trade_date DESC
       LIMIT ?`
    )
    .bind(code, days)
    .all();

  return c.json({ ok: true, data: results });
});

// 月營收（最近 N 個月，預設 24 個月）
stockRoutes.get("/:code/revenue", async (c) => {
  const code = c.req.param("code");
  const months = Math.min(parseInt(c.req.query("months") ?? "24", 10) || 24, 60);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT report_year, report_month,
              revenue, yoy_pct, mom_pct, ytd_revenue, ytd_yoy_pct
       FROM monthly_revenue
       WHERE stock_code = ?
       ORDER BY report_year DESC, report_month DESC
       LIMIT ?`
    )
    .bind(code, months)
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
