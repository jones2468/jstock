/**
 * 一次性腳本：補灌歷史 M1B / M2 到遠端 D1
 * 用法：npx tsx scripts/backfill-m1b.ts
 *
 * 資料來源：央行每月公佈（手動填入下方 DATA 陣列）
 * 央行統計：https://www.cbc.gov.tw/tw/cp-526-1043-47EC3-1.html
 *
 * 單位：百萬元新台幣
 */
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_DIR = join(__dirname, "..");

interface M1BEntry {
  date: string;   // YYYY-MM-01
  m1b: number;    // 百萬元
  m2: number;     // 百萬元
}

// 央行每月公佈的 M1B / M2 數據（手動維護）
// 來源：央行金融統計月報 → 貨幣總計數
// 填入格式：{ date: "YYYY-MM-01", m1b: M1B百萬元, m2: M2百萬元 }
const DATA: M1BEntry[] = [
  // 2024
  { date: "2024-01-01", m1b: 26104878, m2: 58934711 },
  { date: "2024-02-01", m1b: 25787943, m2: 58843453 },
  { date: "2024-03-01", m1b: 26093428, m2: 59329747 },
  { date: "2024-04-01", m1b: 26194456, m2: 59590834 },
  { date: "2024-05-01", m1b: 26338671, m2: 59975988 },
  { date: "2024-06-01", m1b: 26355397, m2: 60185523 },
  { date: "2024-07-01", m1b: 26806963, m2: 60658037 },
  { date: "2024-08-01", m1b: 26671048, m2: 60727704 },
  { date: "2024-09-01", m1b: 26713281, m2: 61146105 },
  { date: "2024-10-01", m1b: 27148483, m2: 61575253 },
  { date: "2024-11-01", m1b: 27032093, m2: 61630789 },
  { date: "2024-12-01", m1b: 27137006, m2: 62019665 },
  // 2025
  { date: "2025-01-01", m1b: 27306370, m2: 62400108 },
  { date: "2025-02-01", m1b: 27171037, m2: 62397283 },
  { date: "2025-03-01", m1b: 27555753, m2: 63072003 },
  // 後續月份：央行公佈後手動加入，然後重跑此 script
];

function escSql(v: number | null): string {
  return v == null || isNaN(v) ? "NULL" : String(v);
}

function main() {
  if (DATA.length === 0) {
    console.log("DATA 陣列是空的，請先填入央行數據");
    return;
  }

  // 計算 YoY
  const m1bByYm = new Map<string, number>();
  for (const d of DATA) m1bByYm.set(d.date.slice(0, 7), d.m1b);

  const stmts: string[] = [];
  for (const d of DATA) {
    const ym = d.date.slice(0, 7);
    const prevYm = `${parseInt(ym.slice(0, 4)) - 1}${ym.slice(4)}`;
    const prev = m1bByYm.get(prevYm);
    const yoy =
      prev != null && prev > 0
        ? Math.round(((d.m1b - prev) / prev) * 10000) / 100
        : null;

    stmts.push(
      `INSERT OR REPLACE INTO monthly_m1b (report_date, m1b, m2, m1b_yoy_pct) VALUES ('${d.date}', ${d.m1b}, ${d.m2}, ${escSql(yoy)});`
    );
  }

  console.log(`Writing ${stmts.length} months to D1...`);

  const tmpFile = join(WORKER_DIR, "_tmp_m1b.sql");
  writeFileSync(tmpFile, stmts.join("\n"), "utf-8");

  try {
    execSync(
      `npx wrangler d1 execute jstock-db --remote --file="${tmpFile}"`,
      { cwd: WORKER_DIR, stdio: "inherit", timeout: 30000 }
    );
    console.log(`\n✅ Upserted ${stmts.length} months of M1B/M2 data`);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

main();
