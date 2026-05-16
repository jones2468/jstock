/**
 * 四大指數日收盤：加權(TAIEX)、櫃買(TPEX)、半導體(SEMI)、金融保險(FINANCE)
 *
 * TAIEX / TPEX → FinMind TaiwanStockPrice（批量歷史）
 * SEMI / FINANCE → TWSE MI_INDEX 每日類股收盤（逐日查詢）
 */

const FINMIND = "https://api.finmindtrade.com/api/v4/data";

export interface IndexDailyRow {
  index_code: string;
  trade_date: string;
  close_price: number | null;
  change_val: number | null;
  change_pct: number | null;
}

// ---------- FinMind (TAIEX / TPEX) ----------

interface FinMindPriceRow {
  date: string;
  close: number;
  spread: number;
  Trading_money: number;
}

async function fetchFinMindIndex(
  dataId: string,
  indexCode: string,
  startDate: string
): Promise<IndexDailyRow[]> {
  const url = `${FINMIND}?dataset=TaiwanStockPrice&data_id=${dataId}&start_date=${startDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FinMind ${dataId} HTTP ${res.status}`);
  const json = (await res.json()) as { data: FinMindPriceRow[] };
  return (json.data ?? []).map((r) => {
    const prev = r.close - r.spread;
    return {
      index_code: indexCode,
      trade_date: r.date,
      close_price: r.close,
      change_val: r.spread,
      change_pct: prev !== 0 ? Math.round((r.spread / prev) * 10000) / 100 : null,
    };
  });
}

// ---------- TWSE MI_INDEX (sector sub-indices) ----------

interface TwseMiIndexResponse {
  stat: string;
  data8?: string[][]; // 類股指數 [名稱, 收盤指數, 漲跌點數, 漲跌百分比(%)]
  data9?: string[][]; // 大盤指數
}

const SECTOR_MAP: Record<string, string> = {
  "半導體類指數": "SEMI",
  "金融保險類指數": "FINANCE",
};

async function fetchTwseSectorIndices(dateStr: string): Promise<IndexDailyRow[]> {
  // dateStr = "YYYYMMDD"
  const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${dateStr}&type=ALLBUT0999`;
  const res = await fetch(url, {
    headers: { "User-Agent": "jstock-worker/1.0" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as TwseMiIndexResponse;
  if (json.stat !== "OK") return [];

  const rows: IndexDailyRow[] = [];
  const isoDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

  for (const arr of json.data8 ?? []) {
    const name = arr[0]?.trim();
    const code = SECTOR_MAP[name];
    if (!code) continue;

    const close = parseFloat(arr[1]?.replace(/,/g, ""));
    const changeStr = arr[2]?.replace(/,/g, "") ?? "";
    const changeVal = parseFloat(changeStr);
    const pctStr = arr[3]?.replace(/,/g, "") ?? "";
    const changePct = parseFloat(pctStr);

    rows.push({
      index_code: code,
      trade_date: isoDate,
      close_price: Number.isFinite(close) ? close : null,
      change_val: Number.isFinite(changeVal) ? changeVal : null,
      change_pct: Number.isFinite(changePct) ? changePct : null,
    });
  }
  return rows;
}

// ---------- Public API ----------

export async function fetchAllIndices(startDate: string): Promise<IndexDailyRow[]> {
  // FinMind: TAIEX + TPEX (batch, one call each)
  const [taiex, tpex] = await Promise.all([
    fetchFinMindIndex("TAIEX", "TAIEX", startDate),
    fetchFinMindIndex("TPEX", "TPEX", startDate),
  ]);

  // TWSE: sector indices — need per-date calls; cover last 7 calendar days
  const sectorRows: IndexDailyRow[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.toISOString().slice(0, 10) < startDate) break;
    const yyyymmdd =
      String(d.getFullYear()) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    try {
      const rows = await fetchTwseSectorIndices(yyyymmdd);
      sectorRows.push(...rows);
    } catch {
      // weekend / holiday / TWSE down — skip
    }
  }

  return [...taiex, ...tpex, ...sectorRows];
}
