// 月營收：公開資訊觀測站（MOPS）
// 上市：t21sc03_<rocYear>_<month>_0.html
// 上櫃：t21sc03_<rocYear>_<month>_0.html (otc 路徑)
// HTML big5 編碼

import iconv from "iconv-lite";

const TWSE_REVENUE = (rocY: number, month: number) =>
  `https://mopsov.twse.com.tw/nas/t21/sii/t21sc03_${rocY}_${month}_0.html`;

const TPEX_REVENUE = (rocY: number, month: number) =>
  `https://mopsov.twse.com.tw/nas/t21/otc/t21sc03_${rocY}_${month}_0.html`;

export interface RevenueRow {
  report_year: number;
  report_month: number;
  stock_code: string;
  revenue: number | null;
  yoy_pct: number | null;
  mom_pct: number | null;
  ytd_revenue: number | null;
  ytd_yoy_pct: number | null;
}

async function fetchBig5Html(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Mozilla/5.0 (jstock-worker)",
    },
  });
  if (!res.ok) throw new Error(`MOPS: HTTP ${res.status} on ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return iconv.decode(buf as any, "big5");
}

// MOPS 表格結構：每個產業有獨立 table，row 有 17 欄左右
// 欄位順序：公司代號、公司名稱、當月營收、上月營收、去年當月營收、上月比較增減%、去年同月增減%、當月累計營收、去年累計營收、累計增減%、備註
function parseRevenueHtml(html: string, year: number, month: number): RevenueRow[] {
  const rows: RevenueRow[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const tds = [...m[1].matchAll(tdRe)].map((t) =>
      t[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    );
    if (tds.length < 10) continue;
    // 第一欄要是 4 碼數字（股票代號）
    const code = tds[0];
    if (!/^[0-9]{4,6}$/.test(code)) continue;

    rows.push({
      report_year: year,
      report_month: month,
      stock_code: code,
      revenue: parseNum(tds[2]),
      mom_pct: parseNum(tds[5]),
      yoy_pct: parseNum(tds[6]),
      ytd_revenue: parseNum(tds[7]),
      ytd_yoy_pct: parseNum(tds[9]),
    });
  }
  return rows;
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null;
  const t = s.replace(/,/g, "").replace(/[^\d.\-]/g, "");
  if (t === "" || t === "-") return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

// 抓某一個月的全市場月營收（上市 + 上櫃）
export async function fetchMonthlyRevenue(
  year: number,
  month: number
): Promise<RevenueRow[]> {
  const rocY = year - 1911;
  const [twseHtml, tpexHtml] = await Promise.all([
    fetchBig5Html(TWSE_REVENUE(rocY, month)).catch(() => ""),
    fetchBig5Html(TPEX_REVENUE(rocY, month)).catch(() => ""),
  ]);
  const twse = twseHtml ? parseRevenueHtml(twseHtml, year, month) : [];
  const tpex = tpexHtml ? parseRevenueHtml(tpexHtml, year, month) : [];
  return [...twse, ...tpex];
}

// 計算「該抓哪個月」：當前月已超過 11 號就抓上月，否則抓上上月
export function targetRevenueMonth(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const day = now.getDate();
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // 0-based → 1-based
  // 月營收 N 月份在 N+1 月 10 號前公告，11 號 cron 抓 N 月（亦即 now 月份-1）
  m -= 1;
  if (day < 11) m -= 1; // 保險：未到 11 號，退到再上一個月
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}
