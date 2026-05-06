import { Hono } from "hono";
import type { HonoEnv } from "../env";
import { runScrapeHoldings } from "../cron/scrape-holdings";
import { runComputeDiffs } from "../cron/compute-diffs";

export const metaRoutes = new Hono<HonoEnv>();

metaRoutes.post("/trigger/:job", async (c) => {
  const job = c.req.param("job");
  const env = c.env;

  switch (job) {
    case "scrape":
      await runScrapeHoldings(env);
      return c.json({ ok: true, triggered: "scrape_holdings" });
    case "diffs":
      await runComputeDiffs(env);
      return c.json({ ok: true, triggered: "compute_diffs" });
    default:
      return c.json({ ok: false, error: `unknown job: ${job}` }, 400);
  }
});

metaRoutes.get("/status", async (c) => {
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT job_name, run_date as last_run, status, record_count
       FROM cron_runs
       WHERE id IN (
         SELECT MAX(id) FROM cron_runs GROUP BY job_name
       )`
    )
    .all();

  const lastUpdated = results.length
    ? results.reduce((latest, r) => {
        const d = r.last_run as string;
        return d > latest ? d : latest;
      }, "")
    : null;

  return c.json({
    ok: true,
    data: { cron_jobs: results, last_updated: lastUpdated },
  });
});
