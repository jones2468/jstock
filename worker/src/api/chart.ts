import { Hono } from "hono";
import type { HonoEnv } from "../env";

export const chartRoutes = new Hono<HonoEnv>();

chartRoutes.get("/:code/prices", async (c) => {
  const code = c.req.param("code");
  const start = c.req.query("start") ?? "2020-01-01";
  const end = c.req.query("end") ?? new Date().toISOString().slice(0, 10);
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT price_date, open_price, high_price, low_price, close_price, volume, change_val
       FROM stock_prices
       WHERE stock_code = ? AND price_date BETWEEN ? AND ?
       ORDER BY price_date`
    )
    .bind(code, start, end)
    .all();

  return c.json({ ok: true, data: results });
});

chartRoutes.get("/:code/indicators", async (c) => {
  const code = c.req.param("code");
  const days = parseInt(c.req.query("days") ?? "120");
  const db = c.env.DB;

  const { results } = await db
    .prepare(
      `SELECT price_date, close_price
       FROM stock_prices
       WHERE stock_code = ?
       ORDER BY price_date DESC
       LIMIT ?`
    )
    .bind(code, days)
    .all();

  if (!results.length) return c.json({ ok: true, data: [] });

  const prices = results
    .reverse()
    .map((r) => ({
      date: r.price_date as string,
      close: r.close_price as number,
    }));

  const indicators = computeIndicators(prices);
  return c.json({ ok: true, data: indicators });
});

function computeIndicators(prices: Array<{ date: string; close: number }>) {
  const closes = prices.map((p) => p.close);
  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const bb = bollingerBands(closes, 20, 2);
  const rsiVals = rsi(closes, 14);
  const macdResult = macd(closes, 12, 26, 9);

  return prices.map((p, i) => ({
    date: p.date,
    ma5: ma5[i] ?? null,
    ma20: ma20[i] ?? null,
    ma60: ma60[i] ?? null,
    bb_upper: bb.upper[i] ?? null,
    bb_middle: bb.middle[i] ?? null,
    bb_lower: bb.lower[i] ?? null,
    rsi: rsiVals[i] ?? null,
    macd_line: macdResult.macd[i] ?? null,
    signal_line: macdResult.signal[i] ?? null,
    histogram: macdResult.histogram[i] ?? null,
  }));
}

function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function bollingerBands(data: number[], period: number, mult: number) {
  const middle = sma(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const std = Math.sqrt(
        slice.reduce((sum, v) => sum + (v - middle[i]!) ** 2, 0) / period
      );
      upper.push(middle[i]! + mult * std);
      lower.push(middle[i]! - mult * std);
    }
  }

  return { upper, middle, lower };
}

function rsi(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [null];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      } else {
        result.push(null);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

function macd(
  data: number[],
  fast: number,
  slow: number,
  signal: number
) {
  const emaFast = ema(data, fast);
  const emaSlow = ema(data, slow);

  const macdLine = emaFast.map((f, i) =>
    f !== null && emaSlow[i] !== null ? f - emaSlow[i]! : null
  );

  const macdNonNull = macdLine.filter((v): v is number => v !== null);
  const signalLine = ema(macdNonNull, signal);
  const offset = macdLine.length - macdNonNull.length;

  const signalFull: (number | null)[] = new Array(offset).fill(null);
  signalFull.push(...signalLine);

  const histogram = macdLine.map((m, i) =>
    m !== null && signalFull[i] !== null ? m - signalFull[i]! : null
  );

  return { macd: macdLine, signal: signalFull, histogram };
}

function ema(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const avg = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(avg);
    } else {
      result.push(data[i] * k + (result[i - 1] as number) * (1 - k));
    }
  }

  return result;
}
