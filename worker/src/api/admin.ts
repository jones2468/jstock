import { Hono } from "hono";
import type { HonoEnv } from "../env";
import { runFetchInstitutionalMargin } from "../cron/fetch-institutional-margin";
import { runFetchPrices } from "../cron/fetch-prices";
import { runFetchRevenue } from "../cron/fetch-revenue";
import { runFetchEPS, runFetchEPSForQuarter } from "../cron/fetch-eps";
import { runFetchMarket } from "../cron/fetch-market";
import { runFetchM1B } from "../cron/fetch-m1b";
import { fetchMarketDaily } from "../data-sources/market";
import {
  runScrapeHoldings,
  runScrapeHoldingsBatch,
} from "../cron/scrape-holdings";
import { fetchMonthlyRevenue } from "../data-sources/mops";
import type { Env } from "../env";

export const adminRoutes = new Hono<HonoEnv>();

adminRoutes.use("/*", async (c, next) => {
  const token = c.env.ADMIN_TOKEN;
  if (!token) return await next();
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${token}`) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }
  return await next();
});

adminRoutes.post("/run/scrape-holdings", async (c) => {
  const offset = parseInt(c.req.query("offset") ?? "0", 10);
  const result = await runScrapeHoldingsBatch(c.env as unknown as Env, offset);
  return c.json({ ok: true, ...result, offset });
});


adminRoutes.get("/stats/holdings", async (c) => {
  const db = c.env.DB;
  const etfCount = await db
    .prepare(`SELECT COUNT(DISTINCT etf_code) as n FROM holdings_snapshots WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM holdings_snapshots)`)
    .first<{ n: number }>();
  const totalRows = await db
    .prepare(`SELECT COUNT(*) as n FROM holdings_snapshots WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM holdings_snapshots)`)
    .first<{ n: number }>();
  const maxDate = await db
    .prepare(`SELECT MAX(snapshot_date) as d FROM holdings_snapshots`)
    .first<{ d: string }>();
  const etfsByType = await db
    .prepare(`SELECT etf_type, COUNT(*) as n FROM etfs GROUP BY etf_type`)
    .all();
  const lastRun = await db
    .prepare(`SELECT * FROM cron_runs WHERE job_name = 'scrape_holdings' ORDER BY run_date DESC LIMIT 1`)
    .first();
  return c.json({
    snapshot_date: maxDate?.d,
    etfs_scraped: etfCount?.n,
    etfs_by_type: etfsByType?.results,
    holdings_rows: totalRows?.n,
    last_run: lastRun,
  });
});

adminRoutes.post("/run/fetch-prices", async (c) => {
  await runFetchPrices(c.env as unknown as Env);
  return c.json({ ok: true });
});

adminRoutes.post("/run/institutional-margin", async (c) => {
  await runFetchInstitutionalMargin(c.env as unknown as Env);
  return c.json({ ok: true });
});

adminRoutes.post("/run/revenue", async (c) => {
  await runFetchRevenue(c.env as unknown as Env);
  return c.json({ ok: true });
});

// 抓指定年月的營收（補抓用）
adminRoutes.post("/run/revenue/:year/:month", async (c) => {
  const year = parseInt(c.req.param("year"), 10);
  const month = parseInt(c.req.param("month"), 10);
  if (!year || !month || month < 1 || month > 12) {
    return c.json({ ok: false, error: "invalid year/month" }, 400);
  }

  const rows = await fetchMonthlyRevenue(year, month);
  if (rows.length === 0) {
    return c.json({ ok: true, data: { year, month, rows: 0 } });
  }

  const db = c.env.DB;
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((r) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO monthly_revenue
           (report_year, report_month, stock_code, revenue, yoy_pct, mom_pct, ytd_revenue, ytd_yoy_pct)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          r.report_year,
          r.report_month,
          r.stock_code,
          r.revenue,
          r.yoy_pct,
          r.mom_pct,
          r.ytd_revenue,
          r.ytd_yoy_pct
        )
    );
    await db.batch(stmts);
  }

  return c.json({ ok: true, data: { year, month, rows: rows.length } });
});

// ---- EPS ----

adminRoutes.post("/run/eps", async (c) => {
  await runFetchEPS(c.env as unknown as Env);
  return c.json({ ok: true });
});

// ---- Market daily ----

adminRoutes.post("/run/market", async (c) => {
  await runFetchMarket(c.env as unknown as Env);
  return c.json({ ok: true });
});

// 一次性 backfill：指定起始日，跑到今天
adminRoutes.post("/run/market-backfill", async (c) => {
  const start = c.req.query("start");
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return c.json({ ok: false, error: "需傳入 ?start=YYYY-MM-DD" }, 400);
  }
  const rows = await fetchMarketDaily(start);
  if (rows.length === 0) {
    return c.json({ ok: true, data: { rows: 0 } });
  }
  const stmts = rows.map((r) =>
    c.env.DB.prepare(
      `INSERT OR REPLACE INTO market_daily
         (trade_date, taiex_close, taiex_change, taiex_change_pct,
          total_volume_value, total_margin_balance, total_short_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      r.trade_date,
      r.taiex_close,
      r.taiex_change,
      r.taiex_change_pct,
      r.total_volume_value,
      r.total_margin_balance,
      r.total_short_balance
    )
  );
  await c.env.DB.batch(stmts);
  return c.json({ ok: true, data: { rows: rows.length, start } });
});

// ---- M1B ----

// 手動新增/更新 M1B 月資料
// curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
//   -d '{"date":"2026-04-01","m1b":28500000,"m2":62000000}' \
//   https://jstock-worker.../api/v1/admin/m1b
adminRoutes.post("/m1b", async (c) => {
  const body = await c.req.json<{
    date: string;      // YYYY-MM-01
    m1b: number;       // 百萬元 NTD
    m2?: number | null; // 百萬元 NTD（選填）
    m1b_yoy_pct?: number | null;
  }>();

  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || body.m1b == null) {
    return c.json({ ok: false, error: "需傳 date (YYYY-MM-01) + m1b (百萬元)" }, 400);
  }

  const db = c.env.DB;

  let yoy = body.m1b_yoy_pct ?? null;
  if (yoy == null) {
    const ym = body.date.slice(0, 7);
    const lastYearDate = `${parseInt(ym.slice(0, 4)) - 1}${ym.slice(4)}-01`;
    const prev = await db
      .prepare(`SELECT m1b FROM monthly_m1b WHERE report_date = ?`)
      .bind(lastYearDate)
      .first<{ m1b: number | null }>();
    if (prev?.m1b && prev.m1b > 0) {
      yoy = Math.round(((body.m1b - prev.m1b) / prev.m1b) * 10000) / 100;
    }
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO monthly_m1b (report_date, m1b, m2, m1b_yoy_pct)
       VALUES (?, ?, ?, ?)`
    )
    .bind(body.date, body.m1b, body.m2 ?? null, yoy)
    .run();

  return c.json({ ok: true, data: { date: body.date, m1b: body.m1b, m1b_yoy_pct: yoy } });
});

// 手動觸發從 IMF 抓 M1B
adminRoutes.post("/run/m1b", async (c) => {
  const result = await runFetchM1B(c.env as unknown as Env);
  return c.json({ ok: true, data: result });
});

// 補抓指定年度 + 季度的 EPS
adminRoutes.post("/run/eps/:year/:quarter", async (c) => {
  const year = parseInt(c.req.param("year"), 10);
  const quarter = parseInt(c.req.param("quarter"), 10);
  if (!year || !quarter || quarter < 1 || quarter > 4) {
    return c.json({ ok: false, error: "invalid year/quarter" }, 400);
  }
  const result = await runFetchEPSForQuarter(
    c.env as unknown as Env,
    year,
    quarter
  );
  return c.json({ ok: true, data: { year, quarter, rows: result.rows } });
});
