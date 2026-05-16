import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getGroups,
  getActiveGroupId,
  setActiveGroupId as _setActive,
  getGroupItems,
  addGroup as _addGroup,
  renameGroup as _renameGroup,
  deleteGroup as _deleteGroup,
  addItemToGroup,
  removeItemFromGroup,
  isItemInGroup,
  type WatchlistGroup,
} from "@/lib/watchlist-groups";
import type { WatchItem, WatchType } from "@/lib/favorites";
import { apiPost } from "@/lib/api";

let listeners: (() => void)[] = [];
let snapshot = { groups: getGroups(), activeId: getActiveGroupId() };

function emitChange() {
  snapshot = { groups: getGroups(), activeId: getActiveGroupId() };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot() {
  return snapshot;
}

function triggerBackfill(type: WatchType, code: string) {
  if (type !== "stock") return;
  apiPost(`/api/v1/stocks/${code}/backfill`, {}).catch(() => {});
  apiPost(`/api/v1/stocks/${code}/backfill-eps`, {}).catch(() => {});
}

export function useWatchlistGroups() {
  const { groups, activeId } = useSyncExternalStore(subscribe, getSnapshot);

  const setActiveGroup = useCallback((id: string) => {
    _setActive(id);
    emitChange();
  }, []);

  const addGroup = useCallback((name: string) => {
    const g = _addGroup(name);
    emitChange();
    return g;
  }, []);

  const renameGroup = useCallback((id: string, name: string) => {
    _renameGroup(id, name);
    emitChange();
  }, []);

  const deleteGroup = useCallback((id: string) => {
    _deleteGroup(id);
    emitChange();
  }, []);

  return { groups, activeId, setActiveGroup, addGroup, renameGroup, deleteGroup };
}

export function useGroupItems(groupId: string) {
  const [items, setItems] = useState<WatchItem[]>(() => getGroupItems(groupId));

  useEffect(() => {
    setItems(getGroupItems(groupId));
  }, [groupId]);

  const refresh = useCallback(() => setItems(getGroupItems(groupId)), [groupId]);

  const toggleItem = useCallback(
    (type: WatchType, code: string) => {
      if (isItemInGroup(groupId, type, code)) {
        setItems(removeItemFromGroup(groupId, type, code));
      } else {
        setItems(addItemToGroup(groupId, type, code));
        triggerBackfill(type, code);
      }
      emitChange();
    },
    [groupId]
  );

  const checkItem = useCallback(
    (type: WatchType, code: string) =>
      items.some((i) => i.type === type && i.code === code),
    [items]
  );

  const stocks = items.filter((i) => i.type === "stock").map((i) => i.code);
  const etfs = items.filter((i) => i.type === "etf").map((i) => i.code);

  return { items, stocks, etfs, toggleItem, checkItem, refresh };
}
