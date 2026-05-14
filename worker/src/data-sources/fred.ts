/**
 * FRED API data source for M1B / M2 monetary aggregates.
 *
 * Taiwan M1B series (IMF IFS): MANMM101TWM189N (Not Seasonally Adjusted, Monthly)
 * Taiwan M2 series:            MABMM301TWM189N
 * If these are incorrect, update the constants below.
 *
 * Free API key: https://fred.stlouisfed.org/docs/api/api_key.html
 */

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

const SERIES_M1B = "MANMM101TWM189N";
const SERIES_M2 = "MABMM301TWM189N";

export interface M1BRow {
  report_date: string;     // YYYY-MM-01
  m1b: number | null;      // 百萬元 NTD
  m2: number | null;       // 百萬元 NTD
  m1b_yoy_pct: number | null;
}

interface FredObs {
  date: string;
  value: string;
}

async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
  startDate: string
): Promise<Map<string, number>> {
  const url =
    `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}` +
    `&file_type=json&observation_start=${startDate}&frequency=m`;

  const res = await fetch(url, {
    headers: { "User-Agent": "jstock-worker/1.0" },
  });
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);

  const json = (await res.json()) as { observations: FredObs[] };
  const map = new Map<string, number>();
  for (const obs of json.observations ?? []) {
    const val = parseFloat(obs.value);
    if (!isNaN(val)) {
      map.set(obs.date, val);
    }
  }
  return map;
}

export async function fetchM1BData(
  apiKey: string,
  startDate: string = "2020-01-01"
): Promise<M1BRow[]> {
  const [m1bMap, m2Map] = await Promise.all([
    fetchFredSeries(SERIES_M1B, apiKey, startDate),
    fetchFredSeries(SERIES_M2, apiKey, startDate),
  ]);

  const allDates = [...new Set([...m1bMap.keys(), ...m2Map.keys()])].sort();

  const m1bByMonth = new Map<string, number>();
  for (const [d, v] of m1bMap) m1bByMonth.set(d.slice(0, 7), v);

  const rows: M1BRow[] = [];
  for (const date of allDates) {
    const m1b = m1bMap.get(date) ?? null;
    const m2 = m2Map.get(date) ?? null;

    const ym = date.slice(0, 7);
    const lastYearYm = `${parseInt(ym.slice(0, 4)) - 1}${ym.slice(4)}`;
    const lastYearM1b = m1bByMonth.get(lastYearYm);
    const yoy =
      m1b != null && lastYearM1b != null && lastYearM1b > 0
        ? Math.round(((m1b - lastYearM1b) / lastYearM1b) * 10000) / 100
        : null;

    rows.push({ report_date: date, m1b, m2, m1b_yoy_pct: yoy });
  }

  return rows;
}
