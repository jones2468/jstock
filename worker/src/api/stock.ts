import { Hono } from "hono";
import type { HonoEnv } from "../env";
import { ensureHistoricalData } from "../utils/backfill";
import { fetchStockEPS } from "../data-sources/mops-eps";

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
  const db = c.env.DB;

  let date = c.req.query("date");
  if (!date) {
    const latest = await db
      .prepare(
        `SELECT MAX(snapshot_date) as d FROM holdings_snapshots WHERE stock_code = ?`
      )
      .bind(code)
      .first<{ d: string | null }>();
    date = latest?.d ?? new Date().toISOString().slice(0, 10);
  }

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

  return c.json({ ok: true, data: results, snapshot_date: date });
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

// 加入 watchlist 時觸發：補歷史 EPS；冪等
stockRoutes.post("/:code/backfill-eps", async (c) => {
  const code = c.req.param("code");
  const db = c.env.DB;

  const existing = await db
    .prepare(`SELECT COUNT(*) as n FROM quarterly_eps WHERE stock_code = ?`)
    .bind(code)
    .first<{ n: number }>();

  if (existing && existing.n >= 8) {
    return c.json({ ok: true, data: { rows: existing.n, skipped: true } });
  }

  try {
    const rows = await fetchStockEPS(code, "2021-01-01");
    if (rows.length > 0) {
      const BATCH = 50;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const stmts = batch.map((r) =>
          db
            .prepare(
              `INSERT OR REPLACE INTO quarterly_eps
               (stock_code, report_year, report_quarter, eps, revenue,
                operating_income, pre_tax_income, net_income)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              r.stock_code, r.report_year, r.report_quarter,
              r.eps, r.revenue, r.operating_income,
              r.pre_tax_income, r.net_income
            )
        );
        await db.batch(stmts);
      }
    }
    return c.json({ ok: true, data: { rows: rows.length, skipped: false } });
  } catch (e) {
    return c.json({ ok: true, data: { rows: 0, error: (e as Error).message } });
  }
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

// 季 EPS 歷史（最近 N 季，預設 12）
stockRoutes.get("/:code/eps", async (c) => {
  const code = c.req.param("code");
  const quarters = Math.min(
    parseInt(c.req.query("quarters") ?? "12", 10) || 12,
    40
  );
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT report_year, report_quarter, eps, revenue,
              operating_income, pre_tax_income, net_income
       FROM quarterly_eps
       WHERE stock_code = ?
       ORDER BY report_year DESC, report_quarter DESC
       LIMIT ?`
    )
    .bind(code, quarters)
    .all();

  return c.json({ ok: true, data: results });
});

// 估值摘要：近四季 EPS + 本益比
stockRoutes.get("/:code/valuation", async (c) => {
  const code = c.req.param("code");
  const db = c.env.DB;

  // 最新收盤價
  const price = await db
    .prepare(
      `SELECT close_price, price_date FROM stock_prices
       WHERE stock_code = ? ORDER BY price_date DESC LIMIT 1`
    )
    .bind(code)
    .first<{ close_price: number; price_date: string }>();

  // 近 4 季 EPS
  const { results: epsRows } = await db
    .prepare(
      `SELECT report_year, report_quarter, eps
       FROM quarterly_eps
       WHERE stock_code = ? AND eps IS NOT NULL
       ORDER BY report_year DESC, report_quarter DESC
       LIMIT 4`
    )
    .bind(code)
    .all<{ report_year: number; report_quarter: number; eps: number }>();

  const trailingEps =
    epsRows.length === 4
      ? Math.round(epsRows.reduce((sum, r) => sum + (r.eps ?? 0), 0) * 100) / 100
      : null;

  const trailingPe =
    trailingEps && trailingEps > 0 && price
      ? Math.round((price.close_price / trailingEps) * 100) / 100
      : null;

  // 近 12 季 EPS（給前端畫趨勢）
  const { results: allEps } = await db
    .prepare(
      `SELECT report_year, report_quarter, eps, revenue,
              operating_income, pre_tax_income, net_income
       FROM quarterly_eps
       WHERE stock_code = ?
       ORDER BY report_year DESC, report_quarter DESC
       LIMIT 12`
    )
    .bind(code)
    .all();

  // 近 5 日法人買賣超合計
  const inst = await db
    .prepare(
      `SELECT SUM(total_net) as net5d
       FROM (SELECT total_net FROM daily_institutional
             WHERE stock_code = ?
             ORDER BY trade_date DESC LIMIT 5)`
    )
    .bind(code)
    .first<{ net5d: number | null }>();

  // ETF 持倉數 + 近期變動
  const etfSignal = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM holdings_snapshots
          WHERE stock_code = ? AND snapshot_date = (SELECT MAX(snapshot_date) FROM holdings_snapshots WHERE stock_code = ?)) as etf_count,
         (SELECT COUNT(*) FROM holdings_diffs
          WHERE stock_code = ? AND diff_type = 'new'
          AND diff_date >= date('now', '-14 days')) as etf_add_14d,
         (SELECT COUNT(*) FROM holdings_diffs
          WHERE stock_code = ? AND diff_type = 'removed'
          AND diff_date >= date('now', '-14 days')) as etf_remove_14d`
    )
    .bind(code, code, code, code)
    .first<{
      etf_count: number;
      etf_add_14d: number;
      etf_remove_14d: number;
    }>();

  return c.json({
    ok: true,
    data: {
      stock_code: code,
      current_price: price?.close_price ?? null,
      price_date: price?.price_date ?? null,
      trailing_eps: trailingEps,
      trailing_pe: trailingPe,
      eps_quarters: allEps,
      institutional_net_5d: inst?.net5d ?? null,
      etf_count: etfSignal?.etf_count ?? 0,
      etf_add_14d: etfSignal?.etf_add_14d ?? 0,
      etf_remove_14d: etfSignal?.etf_remove_14d ?? 0,
    },
  });
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
