// Watchlist：支援個股 + ETF 混合
// 舊格式：string[]（純股票代號）
// 新格式：WatchItem[]，含 type 區分

export type WatchType = "stock" | "etf";

export interface WatchItem {
  type: WatchType;
  code: string;
}

const STORAGE_KEY = "jstock_favorites";

// 讀 localStorage 並 migrate 舊格式（一次寫回後就再也讀不到舊格式）
export function getWatchlist(): WatchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length === 0) return [];

    // 舊格式：string[] → 一律當 stock
    if (typeof parsed[0] === "string") {
      const migrated: WatchItem[] = parsed.map((code: string) => ({
        type: "stock",
        code,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    // 新格式
    return parsed.filter(
      (i: any) =>
        i && typeof i.code === "string" && (i.type === "stock" || i.type === "etf")
    );
  } catch {
    return [];
  }
}

function save(items: WatchItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToWatchlist(type: WatchType, code: string): WatchItem[] {
  const items = getWatchlist();
  if (!items.some((i) => i.type === type && i.code === code)) {
    items.push({ type, code });
    save(items);
  }
  return items;
}

export function removeFromWatchlist(type: WatchType, code: string): WatchItem[] {
  const items = getWatchlist().filter(
    (i) => !(i.type === type && i.code === code)
  );
  save(items);
  return items;
}

export function isInWatchlist(type: WatchType, code: string): boolean {
  return getWatchlist().some((i) => i.type === type && i.code === code);
}

// ── 向下相容（舊 API，僅針對 stock）─────────────────────────────────
// StockLookupPage 等舊呼叫處可繼續用 string-only API

export function getFavorites(): string[] {
  return getWatchlist()
    .filter((i) => i.type === "stock")
    .map((i) => i.code);
}

export function addFavorite(stockCode: string): string[] {
  addToWatchlist("stock", stockCode);
  return getFavorites();
}

export function removeFavorite(stockCode: string): string[] {
  removeFromWatchlist("stock", stockCode);
  return getFavorites();
}

export function isFavorite(stockCode: string): boolean {
  return isInWatchlist("stock", stockCode);
}
