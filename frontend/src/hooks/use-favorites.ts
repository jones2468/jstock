import { useState, useCallback } from "react";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  type WatchItem,
  type WatchType,
} from "@/lib/favorites";
import { apiPost } from "@/lib/api";

export type { WatchItem, WatchType } from "@/lib/favorites";

// fire-and-forget：加入 watchlist 後背景補 1 年股價，user 不用等
function triggerBackfill(type: WatchType, code: string) {
  if (type !== "stock") return;
  apiPost(`/api/v1/stocks/${code}/backfill`, {}).catch(() => {
    /* 背景任務，失敗時下次點進去看圖會再 trigger */
  });
}

export function useFavorites() {
  const [items, setItems] = useState<WatchItem[]>(getWatchlist);

  // 新版 API：明確帶 type
  const toggleItem = useCallback((type: WatchType, code: string) => {
    if (isInWatchlist(type, code)) {
      setItems(removeFromWatchlist(type, code));
    } else {
      setItems(addToWatchlist(type, code));
      triggerBackfill(type, code);
    }
  }, []);

  const checkItem = useCallback(
    (type: WatchType, code: string) =>
      items.some((i) => i.type === type && i.code === code),
    [items]
  );

  // 舊版 API：只針對 stock，向下相容 StockLookupPage / WatchlistPage 既有用法
  const stockCodes = items.filter((i) => i.type === "stock").map((i) => i.code);
  const etfCodes = items.filter((i) => i.type === "etf").map((i) => i.code);

  const toggle = useCallback(
    (code: string) => toggleItem("stock", code),
    [toggleItem]
  );
  const isFavorite = useCallback(
    (code: string) => checkItem("stock", code),
    [checkItem]
  );

  return {
    items,
    stocks: stockCodes,
    etfs: etfCodes,
    favorites: stockCodes,
    toggleItem,
    checkItem,
    toggle,
    isFavorite,
  };
}
