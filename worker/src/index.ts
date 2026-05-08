import { app } from "./router";
import type { Env } from "./env";
import { handleCron } from "./cron/dispatcher";
import { runScrapeHoldings } from "./cron/scrape-holdings";

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === "30 7 * * 1-5") {
      ctx.waitUntil(runScrapeHoldings(env));
    } else {
      ctx.waitUntil(handleCron(event.cron, env));
    }
  },
};
