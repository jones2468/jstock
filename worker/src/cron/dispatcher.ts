import type { Env } from "../env";
import { runScrapeHoldings } from "./scrape-holdings";
import { runComputeDiffs } from "./compute-diffs";
import { runFetchPrices } from "./fetch-prices";
import { runFetchInstitutionalMargin } from "./fetch-institutional-margin";
import { runFetchRevenue } from "./fetch-revenue";
import { DATA_RETENTION_DAYS } from "@jstock/shared";

export async function handleCron(cron: string, env: Env): Promise<void> {
  console.log(`[cron] triggered: ${cron}`);

  switch (cron) {
    case "30 7 * * 1-5":
      await runScrapeHoldings(env);
      break;

    case "45 7 * * 1-5":
      await runFetchPrices(env);
      break;

    case "0 8 * * 1-5":
      await runComputeDiffs(env);
      await runCleanup(env);
      break;

    case "30 8 * * 1-5":
      await runFetchInstitutionalMargin(env);
      break;

    case "0 4 11 * *":
      await runFetchRevenue(env);
      break;

    default:
      console.log(`[cron] unknown schedule: ${cron}`);
  }
}

async function runCleanup(env: Env): Promise<void> {
  const db = env.DB;
  const days = DATA_RETENTION_DAYS;

  const tables = [
    "holdings_snapshots",
    "holdings_diffs",
    "stock_prices",
    "daily_institutional",
    "daily_margin",
  ];
  const dateCol: Record<string, string> = {
    holdings_snapshots: "snapshot_date",
    holdings_diffs: "diff_date",
    stock_prices: "price_date",
    daily_institutional: "trade_date",
    daily_margin: "trade_date",
  };

  for (const table of tables) {
    const col = dateCol[table];
    const { meta } = await db
      .prepare(`DELETE FROM ${table} WHERE ${col} < date('now', '-${days} days')`)
      .run();
    console.log(`[cleanup] ${table}: ${meta.changes} rows deleted`);
  }

  // Also clean old cron_runs
  await db
    .prepare(`DELETE FROM cron_runs WHERE run_date < date('now', '-${days} days')`)
    .run();
}
