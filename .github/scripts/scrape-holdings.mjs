/**
 * GitHub Actions script: scrape all ETF holdings from MoneyDJ → write to D1
 * No subrequest limit, runs full 231+ ETFs in one shot.
 */

const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID;

if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !CF_D1_DATABASE_ID) {
  console.error("Missing env: CF_API_TOKEN, CF_ACCOUNT_ID, CF_D1_DATABASE_ID");
  process.exit(1);
}

const D1_API = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`;
const MONEYDJ_URL = (code) =>
  `https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid=${code}.TW`;

const CONCURRENCY = 5;
const DELAY_MS = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- D1 helpers ----

async function d1Query(sql, params = []) {
  const res = await fetch(D1_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors)}`);
  return json.result[0].results;
}

async function d1InsertHoldings(date, etfCode, holdings) {
  const CHUNK = 25;
  for (let i = 0; i < holdings.length; i += CHUNK) {
    const batch = holdings.slice(i, i + CHUNK);
    const placeholders = batch.map(() => "(?,?,?,?,?,?)").join(",");
    const params = batch.flatMap((h) => [
      date, etfCode, h.stock_code, h.stock_name, h.weight_pct, h.shares,
    ]);
    await d1Query(
      `INSERT OR REPLACE INTO holdings_snapshots
       (snapshot_date, etf_code, stock_code, stock_name, weight_pct, shares)
       VALUES ${placeholders}`,
      params
    );
  }
}

// ---- MoneyDJ scraper ----

function parseHoldingsHtml(html) {
  const holdings = [];
  const re =
    /<td\s+class="col05">\s*<a[^>]*>([^<]+)\((\w+)\.TW\)<\/a>\s*<\/td>\s*<td\s+class="col06">([\d.]+)<\/td>\s*<td\s+class="col07">([\d,.\-]+)<\/td>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const stockName = m[1].trim();
    const stockCode = m[2].trim();
    const weightPct = parseFloat(m[3]);
    const sharesStr = m[4].replace(/,/g, "");
    const shares =
      sharesStr && sharesStr !== "-" ? parseInt(sharesStr, 10) : null;
    if (stockCode && !isNaN(weightPct)) {
      holdings.push({
        stock_code: stockCode,
        stock_name: stockName,
        weight_pct: weightPct,
        shares: isNaN(shares) ? null : shares,
      });
    }
  }
  return holdings;
}

async function scrapeETF(etfCode) {
  const res = await fetch(MONEYDJ_URL(etfCode), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; jstock/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseHoldingsHtml(html);
}

// ---- Main ----

async function main() {
  const today = new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 10); // TST date

  console.log(`[scrape] start, date=${today}`);

  // 1. Get ETF list from D1
  const etfs = await d1Query(
    `SELECT etf_code FROM etfs WHERE etf_type NOT IN ('bond', 'money_market', 'futures') ORDER BY etf_code`
  );
  console.log(`[scrape] ${etfs.length} ETFs to scrape`);

  let etfCount = 0;
  let totalRecords = 0;
  const errors = [];

  // 2. Scrape in batches with concurrency
  for (let i = 0; i < etfs.length; i += CONCURRENCY) {
    const chunk = etfs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (etf) => {
        const holdings = await scrapeETF(etf.etf_code);
        return { code: etf.etf_code, holdings };
      })
    );

    // 3. Write to D1 per successful ETF
    for (let ri = 0; ri < results.length; ri++) {
      const result = results[ri];
      if (result.status === "fulfilled") {
        const { code, holdings } = result.value;
        if (holdings.length === 0) continue;
        await d1InsertHoldings(today, code, holdings);
        totalRecords += holdings.length;
        etfCount++;
      } else {
        const code = chunk[ri]?.etf_code ?? "?";
        errors.push(`${code}: ${result.reason?.message?.slice(0, 60)}`);
      }
    }

    if (i + CONCURRENCY < etfs.length) {
      await sleep(DELAY_MS);
    }

    // Progress log every 50 ETFs
    if ((i + CONCURRENCY) % 50 < CONCURRENCY) {
      console.log(
        `[scrape] progress: ${Math.min(i + CONCURRENCY, etfs.length)}/${etfs.length}`
      );
    }
  }

  // 4. Log cron run
  const startedAt = new Date().toISOString();
  const status =
    errors.length === 0 ? "success" : etfCount > 0 ? "partial" : "failed";
  const errorMsg =
    errors.length > 0
      ? `github-actions; ${errors.slice(0, 20).join("; ")}`.slice(0, 500)
      : "github-actions";

  await d1Query(
    `INSERT INTO cron_runs (job_name, run_date, status, etf_count, record_count, error_message, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["scrape_holdings", today, status, etfCount, totalRecords, errorMsg, startedAt]
  );

  console.log(
    `[scrape] done: ${etfCount}/${etfs.length} ETFs, ${totalRecords} holdings, ${errors.length} errors`
  );

  if (errors.length > 0) {
    console.log(`[scrape] errors:\n${errors.slice(0, 20).join("\n")}`);
  }

  // Fail the action if nothing scraped
  if (etfCount === 0) {
    console.error("[scrape] FATAL: no ETFs scraped");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
