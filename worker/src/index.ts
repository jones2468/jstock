import { app } from "./router";
import type { Env } from "./env";
import { handleCron } from "./cron/dispatcher";

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(event.cron, env));
  },
};
