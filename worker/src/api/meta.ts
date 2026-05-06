import { Hono } from "hono";
import type { HonoEnv } from "../router";

export const metaRoutes = new Hono<HonoEnv>();

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
