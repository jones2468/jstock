import { Hono } from "hono";
import type { HonoEnv } from "../env";

export const marketRoutes = new Hono<HonoEnv>();

interface DailyRow {
  trade_date: string;
  taiex_close: number | null;
  taiex_change: number | null;
  taiex_change_pct: number | null;
  total_volume_value: number | null;
  total_margin_balance: number | null;
  total_short_balance: number | null;
}

type Tone = "red" | "yellow" | "green" | "blue" | "gray";

function average(values: number[]): number | null {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Wilder's smoothing RSI(period)
function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

function volumeSignal(ratio: number | null): Tone {
  if (ratio == null) return "gray";
  if (ratio > 1.5) return "red";
  if (ratio < 0.8) return "blue";
  return "green";
}

function marginSignal(ratio: number | null): Tone {
  if (ratio == null) return "gray";
  if (ratio > 1.2) return "red";
  if (ratio < 0.9) return "blue";
  return "green";
}

function rsiSignal(rsi: number | null): Tone {
  if (rsi == null) return "gray";
  if (rsi > 70) return "red";
  if (rsi < 30) return "green"; // 超賣 = 反向機會，仍視為「冷靜訊號」
  return "green";
}

// 把三軸燈號合成 0-6 分溫度
function aggregateScore(volume: Tone, margin: Tone, rsi: Tone): {
  score: number;
  label: string;
  tone: Tone;
} {
  const toScore = (t: Tone) => {
    if (t === "red") return 2;
    if (t === "blue") return 0;
    if (t === "green" || t === "yellow") return 1;
    return 0;
  };
  const score = toScore(volume) + toScore(margin) + toScore(rsi);

  // 0-1 冷清；2 偏冷；3 中性；4 偏熱；5-6 過熱
  let label: string;
  let tone: Tone;
  if (score <= 1) {
    label = "冷清";
    tone = "blue";
  } else if (score === 2) {
    label = "偏冷";
    tone = "blue";
  } else if (score === 3) {
    label = "中性";
    tone = "green";
  } else if (score === 4) {
    label = "偏熱";
    tone = "yellow";
  } else {
    label = "過熱";
    tone = "red";
  }
  return { score, label, tone };
}

marketRoutes.get("/m1b", async (c) => {
  const db = c.env.DB;
  const months = Math.min(parseInt(c.req.query("months") ?? "36", 10) || 36, 120);

  const { results } = await db
    .prepare(
      `SELECT report_date, m1b, m2, m1b_yoy_pct
       FROM monthly_m1b
       ORDER BY report_date DESC
       LIMIT ?`
    )
    .bind(months)
    .all<{ report_date: string; m1b: number | null; m2: number | null; m1b_yoy_pct: number | null }>();

  return c.json({ ok: true, data: results });
});

marketRoutes.get("/temperature", async (c) => {
  const db = c.env.DB;

  // 取近 90 天作為計算 + 顯示用
  const { results } = await db
    .prepare(
      `SELECT trade_date, taiex_close, taiex_change, taiex_change_pct,
              total_volume_value, total_margin_balance, total_short_balance
       FROM market_daily
       ORDER BY trade_date DESC
       LIMIT 90`
    )
    .all<DailyRow>();

  if (results.length === 0) {
    return c.json({ ok: true, data: null, message: "no market data" });
  }

  // 倒序拿出來後反轉成時間升序方便計算
  const asc = [...results].reverse();
  const latest = asc[asc.length - 1];

  const volumes = asc.map((r) => r.total_volume_value).filter((v): v is number => v != null);
  const margins = asc.map((r) => r.total_margin_balance).filter((v): v is number => v != null);
  const closes = asc.map((r) => r.taiex_close).filter((v): v is number => v != null);

  const last5Vol = average(volumes.slice(-5));
  const last60Vol = average(volumes.slice(-60));
  const volRatio = last5Vol != null && last60Vol != null && last60Vol > 0
    ? Math.round((last5Vol / last60Vol) * 100) / 100
    : null;

  const currentMargin = margins[margins.length - 1] ?? null;
  const last60Margin = average(margins.slice(-60));
  const marRatio = currentMargin != null && last60Margin != null && last60Margin > 0
    ? Math.round((currentMargin / last60Margin) * 100) / 100
    : null;

  const rsi = computeRSI(closes, 14);

  const vSig = volumeSignal(volRatio);
  const mSig = marginSignal(marRatio);
  const rSig = rsiSignal(rsi);
  const aggregate = aggregateScore(vSig, mSig, rSig);

  return c.json({
    ok: true,
    data: {
      latest_date: latest.trade_date,
      taiex_close: latest.taiex_close,
      taiex_change: latest.taiex_change,
      taiex_change_pct: latest.taiex_change_pct,
      volume: {
        current: last5Vol,
        avg60: last60Vol,
        ratio: volRatio,
        signal: vSig,
      },
      margin: {
        current: currentMargin,
        avg60: last60Margin,
        ratio: marRatio,
        signal: mSig,
      },
      rsi: { value: rsi, signal: rSig },
      temperature: aggregate,
      // 倒序送回前端（前端要畫圖再反）
      history: results,
      m1b: await getLatestM1B(db),
    },
  });
});

// 四大指數近 N 日收盤（給 mini bar sparkline）
marketRoutes.get("/indices", async (c) => {
  const db = c.env.DB;
  const days = Math.min(parseInt(c.req.query("days") ?? "30", 10) || 30, 90);

  type Row = { index_code: string; trade_date: string; close_price: number | null; change_val: number | null; change_pct: number | null };
  type Point = { date: string; close: number | null; change: number | null; pct: number | null };

  const grouped: Record<string, Point[]> = {};

  // index_daily 可能尚未建表（migration 未跑），用 try/catch 容錯
  try {
    const { results } = await db
      .prepare(
        `SELECT index_code, trade_date, close_price, change_val, change_pct
         FROM index_daily
         WHERE trade_date >= date('now', '-' || ? || ' days')
         ORDER BY index_code, trade_date ASC`
      )
      .bind(days)
      .all<Row>();

    for (const r of results) {
      if (!grouped[r.index_code]) grouped[r.index_code] = [];
      grouped[r.index_code].push({ date: r.trade_date, close: r.close_price, change: r.change_val, pct: r.change_pct });
    }
  } catch {
    // table doesn't exist yet
  }

  // Fallback: 如果 TAIEX 沒有 index_daily 資料，從 market_daily 補上
  if (!grouped["TAIEX"] || grouped["TAIEX"].length === 0) {
    const { results: md } = await db
      .prepare(
        `SELECT trade_date, taiex_close, taiex_change, taiex_change_pct
         FROM market_daily
         WHERE trade_date >= date('now', '-' || ? || ' days')
         ORDER BY trade_date ASC`
      )
      .bind(days)
      .all<{ trade_date: string; taiex_close: number | null; taiex_change: number | null; taiex_change_pct: number | null }>();

    if (md.length > 0) {
      grouped["TAIEX"] = md.map((r) => ({
        date: r.trade_date,
        close: r.taiex_close,
        change: r.taiex_change,
        pct: r.taiex_change_pct,
      }));
    }
  }

  return c.json({ ok: true, data: grouped });
});

async function getLatestM1B(db: D1Database) {
  const row = await db
    .prepare(
      `SELECT report_date, m1b, m2, m1b_yoy_pct
       FROM monthly_m1b ORDER BY report_date DESC LIMIT 1`
    )
    .first<{ report_date: string; m1b: number | null; m2: number | null; m1b_yoy_pct: number | null }>();
  return row ?? null;
}
