# CLAUDE.md — jstock

主動式 ETF 每日自動監測系統。追蹤台灣 19 檔主動式 ETF 的持股異動。

## Tech Stack

- **Cloudflare Workers** — API + cron（Hono router）
- **Cloudflare D1** — SQLite 資料庫
- **Cloudflare Pages** — React 前端（Vite + TailwindCSS）
- **資料來源**：MoneyDJ（爬持股 HTML）、TWSE OpenAPI（股價）、FinMind（歷史股價回補）

## Monorepo 結構

- `packages/shared/` — 共用 TypeScript 型別 + ETF 常數
- `worker/` — Cloudflare Worker（API endpoints + 排程爬蟲）
- `frontend/` — React SPA

## 常用指令

```bash
npm run dev:worker      # wrangler dev
npm run dev:frontend    # vite dev
npm run deploy:worker   # wrangler deploy
npm run deploy:frontend # pages deploy
```

## D1 資料庫

5 張表：`etfs`、`holdings_snapshots`、`holdings_diffs`、`stock_prices`、`cron_runs`

## 每日排程（UTC）

- 07:30 爬 MoneyDJ 持股
- 07:45 抓 TWSE 收盤價
- 08:00 計算異動差異
