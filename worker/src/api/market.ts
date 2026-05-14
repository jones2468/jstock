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
    },
  });
});
