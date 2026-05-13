// 季 EPS：FinMind API + TWSE BWIBBU_ALL fallback
// FinMind 提供每股盈餘 (EPS) + 營收 + 稅前淨利等財務科目
// BWIBBU_ALL 提供即時本益比（作為 cross-validation）

import { FINMIND_API } from "@jstock/shared";

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

interface FinMindRow {
  date: string;
  stock_id: string;
  type: string;
  value: number;
}

/**
 * 用 FinMind 抓單一股票的季度財務數據
 */
export async function fetchStockEPS(
  stockCode: string,
  startDate: string = "2023-01-01"
): Promise<QuarterlyEPSRow[]> {
  const url = `${FINMIND_API}?dataset=TaiwanStockFinancialStatements&data_id=${stockCode}&start_date=${startDate}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (jstock-worker)" },
  });

  if (!res.ok) throw new Error(`FinMind: HTTP ${res.status} for ${stockCode}`);

  const json = (await res.json()) as { status: number; data: FinMindRow[] };
  if (!json.data?.length) return [];

  // FinMind 回傳多種 type（Revenue, EPS, PreTaxIncome, OperatingIncome, IncomeAfterTaxes 等）
  // 按日期分組，每組就是一季
  const byDate = new Map<string, Map<string, number>>();
  for (const row of json.data) {
    if (!byDate.has(row.date)) byDate.set(row.date, new Map());
    byDate.get(row.date)!.set(row.type, row.value);
  }

  const results: QuarterlyEPSRow[] = [];
  for (const [dateStr, types] of byDate) {
    const { year, quarter } = dateToYearQuarter(dateStr);
    if (!year || !quarter) continue;

    const eps = types.get("EPS") ?? null;
    // 只保留有 EPS 的季度
    if (eps === null) continue;

    results.push({
      stock_code: stockCode,
      report_year: year,
      report_quarter: quarter,
      eps,
      revenue: types.get("Revenue") ?? null,
      operating_income: types.get("OperatingIncome") ?? null,
      pre_tax_income: types.get("PreTaxIncome") ?? null,
      net_income: types.get("IncomeAfterTaxes") ?? null,
    });
  }

  return results.sort(
    (a, b) => a.report_year - b.report_year || a.report_quarter - b.report_quarter
  );
}

/**
 * 批量抓多支股票的 EPS（帶 rate limit 控制）
 */
export async function fetchBatchEPS(
  stockCodes: string[],
  startDate: string = "2023-01-01",
  delayMs: number = 300
): Promise<QuarterlyEPSRow[]> {
  const all: QuarterlyEPSRow[] = [];

  for (let i = 0; i < stockCodes.length; i++) {
    const code = stockCodes[i];
    try {
      const rows = await fetchStockEPS(code, startDate);
      all.push(...rows);
      if (i % 50 === 0 && i > 0) {
        console.log(`[eps] progress: ${i}/${stockCodes.length} (${all.length} rows)`);
      }
    } catch (e) {
      console.error(`[eps] ${code} failed: ${(e as Error).message}`);
    }

    // Rate limit: FinMind free tier 限 200 req/min
    if (delayMs > 0 && i < stockCodes.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return all;
}

/**
 * 用 TWSE BWIBBU_ALL 抓即時本益比（所有上市股）
 * 回傳 Map<stock_code, pe_ratio>
 */
export async function fetchCurrentPERatios(): Promise<Map<string, number>> {
  const res = await fetch(
    "https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL",
    { headers: { "User-Agent": "Mozilla/5.0 (jstock-worker)" } }
  );
  if (!res.ok) throw new Error(`BWIBBU_ALL: HTTP ${res.status}`);

  const data = (await res.json()) as Array<{
    Code: string;
    PEratio: string;
  }>;

  const map = new Map<string, number>();
  for (const row of data) {
    const pe = parseFloat(row.PEratio);
    if (!isNaN(pe) && pe > 0) {
      map.set(row.Code, pe);
    }
  }
  return map;
}

function dateToYearQuarter(dateStr: string): {
  year: number | null;
  quarter: number | null;
} {
  // FinMind date format: "2024-03-31", "2024-06-30", "2024-09-30", "2024-12-31"
  const parts = dateStr.split("-");
  if (parts.length < 2) return { year: null, quarter: null };

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  const quarter =
    month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : month <= 12 ? 4 : null;

  return { year, quarter };
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
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (m >= 9 || (m === 8 && d >= 15)) return { year: y, quarter: 2 };
  if (m >= 12 || (m === 11 && d >= 15)) return { year: y, quarter: 3 };
  if (m >= 6 || (m === 5 && d >= 16)) return { year: y, quarter: 1 };
  if (m >= 4 || (m === 3 && d >= 31)) return { year: y - 1, quarter: 4 };

  return { year: y - 1, quarter: 3 };
}
