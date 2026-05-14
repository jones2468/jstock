/**
 * IMF International Financial Statistics (IFS) — Taiwan M1 / Broad Money
 * 免費、免 API key、Worker 端 DNS 正常
 *
 * 台灣 M1B 是央行獨有分類，IMF 只有 M1 (FAML_XDC) 和 Broad Money (FMB_XDC)。
 * M1 趨勢與 M1B 高度相關，足以判斷資金鬆緊。
 */

const IMF_BASE = "https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData";

// IFS indicator codes for Taiwan (REF_AREA=TW)
const INDICATOR_M1 = "FAML_XDC";     // Money (M1), national currency
const INDICATOR_M2 = "FMB_XDC";      // Broad money, national currency

export interface M1BRow {
  report_date: string;        // YYYY-MM-01
  m1b: number | null;         // M1 百萬元 NTD（IMF 的 M1 近似台灣 M1B）
  m2: number | null;          // Broad money 百萬元 NTD
  m1b_yoy_pct: number | null;
}

interface IMFObs {
  "@TIME_PERIOD": string;  // "2024-01"
  "@OBS_VALUE": string;
}

async function fetchIMFSeries(
  indicator: string,
  startYear: number
): Promise<Map<string, number>> {
  const url = `${IMF_BASE}/IFS/M.TW.${indicator}?startPeriod=${startYear}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`IMF ${indicator}: HTTP ${res.status}`);

  const json = await res.json() as any;
  const map = new Map<string, number>();

  const series = json?.CompactData?.DataSet?.Series;
  if (!series) return map;

  const obsList: IMFObs[] = Array.isArray(series.Obs)
    ? series.Obs
    : series.Obs
      ? [series.Obs]
      : [];

  for (const obs of obsList) {
    const period = obs["@TIME_PERIOD"];  // "2024-01"
    const val = parseFloat(obs["@OBS_VALUE"]);
    if (period && !isNaN(val)) {
      map.set(`${period}-01`, val);  // → "2024-01-01"
    }
  }

  return map;
}

export async function fetchM1BFromIMF(
  startYear: number = 2020
): Promise<M1BRow[]> {
  const [m1Map, m2Map] = await Promise.all([
    fetchIMFSeries(INDICATOR_M1, startYear),
    fetchIMFSeries(INDICATOR_M2, startYear),
  ]);

  const allDates = [...new Set([...m1Map.keys(), ...m2Map.keys()])].sort();
  const m1ByYm = new Map<string, number>();
  for (const [d, v] of m1Map) m1ByYm.set(d.slice(0, 7), v);

  const rows: M1BRow[] = [];
  for (const date of allDates) {
    const m1 = m1Map.get(date) ?? null;
    const m2 = m2Map.get(date) ?? null;

    const ym = date.slice(0, 7);
    const prevYm = `${parseInt(ym.slice(0, 4)) - 1}${ym.slice(4)}`;
    const prevM1 = m1ByYm.get(prevYm);
    const yoy =
      m1 != null && prevM1 != null && prevM1 > 0
        ? Math.round(((m1 - prevM1) / prevM1) * 10000) / 100
        : null;

    rows.push({ report_date: date, m1b: m1, m2, m1b_yoy_pct: yoy });
  }

  return rows;
}
