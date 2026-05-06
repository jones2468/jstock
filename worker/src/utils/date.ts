export function getTwMarketDate(): string {
  const now = new Date();
  const twOffset = 8 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const twDate = new Date(utcMs + twOffset * 60_000);

  const y = twDate.getFullYear();
  const m = String(twDate.getMonth() + 1).padStart(2, "0");
  const d = String(twDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getPrevTradingDate(db: D1Database, beforeDate: string): Promise<string | null> {
  return db
    .prepare(
      `SELECT DISTINCT snapshot_date
       FROM holdings_snapshots
       WHERE snapshot_date < ?
       ORDER BY snapshot_date DESC
       LIMIT 1`
    )
    .bind(beforeDate)
    .first<string>("snapshot_date");
}
