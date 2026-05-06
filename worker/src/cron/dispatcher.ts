import type { Env } from "../env";

export async function handleCron(cron: string, env: Env): Promise<void> {
  console.log(`[cron] triggered: ${cron}`);

  switch (cron) {
    case "30 7 * * 1-5":
      // TODO Phase 2: scrape MoneyDJ holdings
      console.log("[cron] scrape_holdings — not implemented yet");
      break;

    case "45 7 * * 1-5":
      // TODO Phase 4: fetch stock prices
      console.log("[cron] fetch_prices — not implemented yet");
      break;

    case "0 8 * * 1-5":
      // TODO Phase 2: compute holdings diffs
      console.log("[cron] compute_diffs — not implemented yet");
      break;

    case "0 0 * * 0":
      // TODO: cleanup old data
      console.log("[cron] cleanup — not implemented yet");
      break;

    default:
      console.log(`[cron] unknown schedule: ${cron}`);
  }
}
