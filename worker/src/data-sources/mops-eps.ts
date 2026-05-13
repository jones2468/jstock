// 季 EPS：公開資訊觀測站（MOPS）綜合損益表
// t163sb04 — 個別公司，欄位較完整
// t163sb06 — 簡易版，fallback
// HTML big5 編碼

import iconv from "iconv-lite";

const MOPS_URL = "https://mops.twse.com.tw/mops/web/ajax_t163sb04";

export interface QuarterlyEPSRow {
  stock_code: string;
  report_year: number;
  report_quarter: number;
  eps: number | null;
  revenue: number | null;
  operating_income: number | null;
  pre_tax_income: number | null;
  net_income: number | null;
}

/**
 * 抓某一季的全市場季 EPS（上市 + 上櫃）
 */
export async function fetchQuarterlyEPS(
  year: number,
  quarter: number
): Promise<QuarterlyEPSRow[]> {
  const rocYear = year - 1911;
  const [twse, tpex] = await Promise.all([
    fetchMOPSTable("sii", rocYear, quarter, year).catch((e) => {
      console.error(`[eps] TWSE fetch failed: ${(e as Error).message}`);
      return [] as QuarterlyEPSRow[];
    }),
    fetchMOPSTable("otc", rocYear, quarter, year).catch((e) => {
      console.error(`[eps] TPEX fetch failed: ${(e as Error).message}`);
      return [] as QuarterlyEPSRow[];
    }),
  ]);
  return [...twse, ...tpex];
}

async function fetchMOPSTable(
  typek: string,
  rocYear: number,
  quarter: number,
  year: number
): Promise<QuarterlyEPSRow[]> {
  const body = new URLSearchParams({
    encodeURIComponent: "1",
    step: "1",
    firstin: "1",
    off: "1",
    TYPEK: typek,
    year: String(rocYear),
    season: String(quarter),
  });

  const res = await fetch(MOPS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (jstock-worker)",
      Accept: "text/html",
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`MOPS EPS: HTTP ${res.status} for ${typek}`);

  const buf = new Uint8Array(await res.arrayBuffer());
  // MOPS ajax response 有時是 utf-8，有時是 big5；先嘗試 utf-8 再 fallback
  let html: string;
  try {
    html = new TextDecoder("utf-8").decode(buf);
    // 如果有亂碼特徵（常見 big5 雙字節被 utf8 解爛），改用 big5
    if (html.includes("�") || html.includes("�")) {
      html = iconv.decode(buf as any, "big5");
    }
  } catch {
    html = iconv.decode(buf as any, "big5");
  }

  return parseEPSHtml(html, year, quarter);
}

/**
 * MOPS t163sb04 表格結構：
 * 每個產業一個 table，每 row 有多欄。
 * 關鍵欄位（依序）：
 *   公司代號、公司名稱、
 *   營業收入、營業成本、營業毛利、營業費用、營業利益、
 *   營業外收入及支出、稅前淨利、所得稅費用、本期淨利、
 *   基本每股盈餘(元)
 *
 * 注意：不同產業 table 欄數可能不同（金控/銀行欄位不同）
 * 我們用「找到 4~6 碼數字的 row → 從尾部取 EPS」的策略
 */
function parseEPSHtml(
  html: string,
  year: number,
  quarter: number
): QuarterlyEPSRow[] {
  const rows: QuarterlyEPSRow[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const tds = [...m[1].matchAll(tdRe)].map((t) =>
      t[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim()
    );

    if (tds.length < 8) continue;

    // 第一欄要是 4~6 碼數字（股票代號）
    const code = tds[0].trim();
    if (!/^[0-9]{4,6}$/.test(code)) continue;

    // 從尾部找 EPS（通常是最後一欄或倒數第二欄）
    // 先嘗試找「基本每股盈餘」：從後往前找第一個像數字的欄位
    const eps = findEPS(tds);

    // 營收、營業利益、稅前淨利、本期淨利通常是 index 2, 6, 8, 10 附近
    // 但欄數不固定，用保守策略
    const revenue = parseNum(tds[2]);
    const operating_income = tds.length >= 7 ? parseNum(tds[6]) : null;
    const pre_tax_income = tds.length >= 9 ? parseNum(tds[8]) : null;
    const net_income = tds.length >= 11 ? parseNum(tds[10]) : null;

    rows.push({
      stock_code: code,
      report_year: year,
      report_quarter: quarter,
      eps,
      revenue,
      operating_income,
      pre_tax_income,
      net_income,
    });
  }

  return rows;
}

/**
 * 從 td 陣列的尾部找 EPS 值
 * MOPS 的基本每股盈餘通常是最後一欄（或倒數第二欄是「稀釋每股盈餘」）
 * EPS 的特徵：小數點數值、通常 -999 ~ 999 之間
 */
function findEPS(tds: string[]): number | null {
  // 從尾部往前找（最多看 3 欄）
  for (let i = tds.length - 1; i >= Math.max(0, tds.length - 3); i--) {
    const val = parseNum(tds[i]);
    if (val !== null && Math.abs(val) < 9999) {
      return val;
    }
  }
  return null;
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null;
  const t = s
    .replace(/,/g, "")
    .replace(/[^\d.\-]/g, "")
    .trim();
  if (t === "" || t === "-") return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

/**
 * 判斷該抓哪一季的 EPS
 * 季報公告期限：
 *   Q1 → 5/15 前
 *   Q2 → 8/14 前
 *   Q3 → 11/14 前
 *   Q4 → 3/31 前（隔年）
 */
export function targetEPSQuarter(now: Date = new Date()): {
  year: number;
  quarter: number;
} {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-based
  const d = now.getDate();

  // 5/16 以後可抓 Q1
  if (m >= 9 || (m === 8 && d >= 15)) return { year: y, quarter: 2 };
  if (m >= 12 || (m === 11 && d >= 15)) return { year: y, quarter: 3 };
  if (m >= 6 || (m === 5 && d >= 16)) return { year: y, quarter: 1 };
  if (m >= 4 || (m === 3 && d >= 31)) return { year: y - 1, quarter: 4 };

  // 1~3月中：還在等 Q4（去年的）
  return { year: y - 1, quarter: 3 };
}
