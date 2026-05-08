// 手動觸發 cron 任務（用於部署後驗證 / 補抓資料）
// 不上認證 — 假設只在開發/Phase B 上線初期用，之後可加 token

import { Hono } from "hono";
import type { HonoEnv } from "../env";
import { runFetchInstitutionalMargin } from "../cron/fetch-institutional-margin";
import { runFetchRevenue } from "../cron/fetch-revenue";
import { fetchMonthlyRevenue } from "../data-sources/mops";
import type { Env } from "../env";

export const adminRoutes = new Hono<HonoEnv>();

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
