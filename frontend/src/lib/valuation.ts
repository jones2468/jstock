import type { EPSRow } from "@/hooks/use-stock-detail";

const REPORT_LAG_DAYS = 45;

export function quarterEndDate(year: number, q: number): Date {
  return new Date(Date.UTC(year, q * 3, 0));
}

export function quarterAvailableDate(year: number, q: number): Date {
  const end = quarterEndDate(year, q);
  return new Date(end.getTime() + REPORT_LAG_DAYS * 86400_000);
}

function quarterKey(year: number, q: number): number {
  return year * 10 + q;
}

export function trailingEpsAt(
  sortedDescEps: EPSRow[],
  asOf: Date
): number | null {
  const known = sortedDescEps.filter(
    (r) => quarterAvailableDate(r.report_year, r.report_quarter).getTime() <= asOf.getTime()
  );
  if (known.length < 4) return null;
  const top4 = known.slice(0, 4);
  let sum = 0;
  for (const r of top4) {
    if (r.eps == null) return null;
    sum += r.eps;
  }
  return sum;
}

export interface MonthlySample {
  date: string;
  close: number;
  trailingEps: number | null;
  pe: number | null;
}

export function buildMonthlySamples(
  prices: { price_date: string; close_price: number }[],
  epsDesc: EPSRow[]
): MonthlySample[] {
  if (prices.length === 0) return [];

  // Group by year-month; keep the last (chronologically latest) row of each month.
  const byMonth = new Map<string, { date: string; close: number }>();
  for (const p of prices) {
    const ym = p.price_date.slice(0, 7);
    const existing = byMonth.get(ym);
    if (!existing || p.price_date > existing.date) {
      byMonth.set(ym, { date: p.price_date, close: p.close_price });
    }
  }

  const months = [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
  return months.map(({ date, close }) => {
    const eps = trailingEpsAt(epsDesc, new Date(date));
    const pe = eps != null && eps > 0 ? close / eps : null;
    return { date, close, trailingEps: eps, pe };
  });
}

export function percentileRank(values: number[], target: number): number | null {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  const below = valid.filter((v) => v <= target).length;
  return (below / valid.length) * 100;
}

export function classifyPE(percentile: number): {
  label: string;
  tone: "low" | "mid" | "high";
} {
  if (percentile <= 25) return { label: "相對便宜", tone: "low" };
  if (percentile >= 75) return { label: "相對偏貴", tone: "high" };
  return { label: "中位區間", tone: "mid" };
}

// Re-export to keep call sites typed against this util layer
export { quarterKey };
