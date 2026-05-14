/**
 * 中央銀行 Open Data — 貨幣總計數 M1B / M2（月底值）
 * CSV 免 API key，HiNetCDN（非 Cloudflare），Workers 可直接抓
 */

const CBC_CSV_URL =
  "https://www.cbc.gov.tw/public/data/OpenData/%E7%B6%93%E7%A0%94%E8%99%95/EF17M01.csv";

export interface M1BRow {
  report_date: string; // YYYY-MM-01
  m1b: number | null; // 百萬元 NTD
  m2: number | null;
  m1b_yoy_pct: number | null;
}

// CSV col indices (0-based): 27=M1B值, 28=M1B年增率, 29=M2值
const COL_PERIOD = 0;
const COL_M1B = 27;
const COL_M1B_YOY = 28;
const COL_M2 = 29;

function parseCSVRow(line: string): string[] {
  return line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
}

function periodToDate(period: string): string | null {
  const m = period.match(/^(\d{4})M(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-01`;
}

function num(v: string): number | null {
  if (!v || v === "-") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export async function fetchM1BFromCBC(
  startYear: number = 2020
): Promise<M1BRow[]> {
  const res = await fetch(CBC_CSV_URL);
  if (!res.ok) throw new Error(`CBC CSV: HTTP ${res.status}`);

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());

  // skip header
  const rows: M1BRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    const date = periodToDate(cols[COL_PERIOD]);
    if (!date) continue;
    if (parseInt(date.slice(0, 4)) < startYear) continue;

    rows.push({
      report_date: date,
      m1b: num(cols[COL_M1B]),
      m2: num(cols[COL_M2]),
      m1b_yoy_pct: num(cols[COL_M1B_YOY]),
    });
  }

  return rows;
}
