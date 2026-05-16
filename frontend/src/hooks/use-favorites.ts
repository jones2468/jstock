import { useWatchlistGroups, useGroupItems } from "./use-watchlist-groups";
import { useCallback } from "react";

export type { WatchItem, WatchType } from "@/lib/favorites";

export function useFavorites() {
  const { activeId } = useWatchlistGroups();
  const { items, stocks, etfs, toggleItem, checkItem } = useGroupItems(activeId);

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
    stocks,
    etfs,
    favorites: stocks,
    toggleItem,
    checkItem,
    toggle,
    isFavorite,
  };
}
