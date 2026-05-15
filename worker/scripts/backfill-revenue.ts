/**
 * 月營收 backfill：對部署中的 worker 連續呼叫 admin endpoint，
 * 依序往前抓 N 個月的全市場月營收。
 *
 * 用法：
 *   cd worker
 *   npx tsx scripts/backfill-revenue.ts --months 12
 *   npx tsx scripts/backfill-revenue.ts --year 2024 --month 5      # 指定單月
 *
 * 環境變數：
 *   WORKER_URL    （預設 https://jstock-worker.joneslee246.workers.dev）
 *   ADMIN_TOKEN   （worker 有設 ADMIN_TOKEN 時必填）
 */

const WORKER_URL =
  process.env.WORKER_URL ?? "https://jstock-worker.joneslee246.workers.dev";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

function parseArgs(): { months: number; single?: { y: number; m: number } } {
  const args = process.argv.slice(2);
  let months = 12;
  let y: number | undefined;
  let m: number | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--months") months = parseInt(args[++i], 10);
    else if (args[i] === "--year") y = parseInt(args[++i], 10);
    else if (args[i] === "--month") m = parseInt(args[++i], 10);
  }
  if (y && m) return { months: 0, single: { y, m } };
  return { months };
}

// 計算往前 N 個月的 (year, month) 序列（不含本月，因本月資料未公告）
function previousMonths(n: number, anchor: Date = new Date()): Array<{ y: number; m: number }> {
  const out: Array<{ y: number; m: number }> = [];
  // 月營收 N 月在 N+1 月 10 號後公告。從上個月（穩定可抓）往前推。
  let y = anchor.getFullYear();
  let m = anchor.getMonth(); // 0-based → 等於上個月的 1-based
  if (anchor.getDate() < 11) m -= 1; // 還沒到 11 號，再退一個月
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  for (let i = 0; i < n; i++) {
    out.push({ y, m });
    m -= 1;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
  }
  return out;
}

async function callOne(y: number, m: number): Promise<{ ok: boolean; rows?: number; err?: string }> {
  const url = `${WORKER_URL}/api/v1/admin/run/revenue/${y}/${m}`;
  const headers: Record<string, string> = {};
  if (ADMIN_TOKEN) headers["Authorization"] = `Bearer ${ADMIN_TOKEN}`;
  try {
    const res = await fetch(url, { method: "POST", headers });
    const json = (await res.json()) as { ok: boolean; data?: { rows: number }; error?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, err: json.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, rows: json.data?.rows ?? 0 };
  } catch (e) {
    return { ok: false, err: (e as Error).message };
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs();
  const targets = args.single
    ? [{ y: args.single.y, m: args.single.m }]
    : previousMonths(args.months);

  console.log(`Target: ${WORKER_URL}`);
  console.log(`Backfilling ${targets.length} month(s):`);
  console.log(targets.map((t) => `${t.y}-${String(t.m).padStart(2, "0")}`).join(", "));
  console.log("");

  let ok = 0;
  let fail = 0;
  let totalRows = 0;
  for (const { y, m } of targets) {
    process.stdout.write(`  ${y}-${String(m).padStart(2, "0")} ... `);
    const r = await callOne(y, m);
    if (r.ok) {
      ok++;
      totalRows += r.rows ?? 0;
      console.log(`OK (${r.rows} rows)`);
    } else {
      fail++;
      console.log(`FAIL: ${r.err}`);
    }
    // 對 MOPS 友善：每次間隔 2 秒
    await sleep(2000);
  }

  console.log("");
  console.log(`Done: ${ok} ok / ${fail} fail / ${totalRows} total rows`);
}

main();
