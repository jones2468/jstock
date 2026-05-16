import { type WatchItem, type WatchType, getWatchlist } from "./favorites";

export interface WatchlistGroup {
  id: string;
  name: string;
}

const GROUPS_KEY = "jstock_wl_groups";
const ITEMS_PREFIX = "jstock_wl_";
const ACTIVE_KEY = "jstock_wl_active";
const OLD_FAVORITES_KEY = "jstock_favorites";
const DEFAULT_ID = "default";

function readGroups(): WatchlistGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveGroups(groups: WatchlistGroup[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

function itemsKey(groupId: string) {
  return `${ITEMS_PREFIX}${groupId}`;
}

function readItems(groupId: string): WatchItem[] {
  try {
    const raw = localStorage.getItem(itemsKey(groupId));
    if (!raw) return [];
    return JSON.parse(raw).filter(
      (i: any) => i && typeof i.code === "string" && (i.type === "stock" || i.type === "etf")
    );
  } catch {
    return [];
  }
}

function saveItems(groupId: string, items: WatchItem[]) {
  localStorage.setItem(itemsKey(groupId), JSON.stringify(items));
}

// --- Migration: 舊 jstock_favorites → default group（一次性） ---

function ensureMigrated(): WatchlistGroup[] {
  let groups = readGroups();
  if (groups.length > 0) return groups;

  const oldItems = getWatchlist();
  groups = [{ id: DEFAULT_ID, name: "預設" }];
  saveGroups(groups);
  saveItems(DEFAULT_ID, oldItems);
  localStorage.setItem(ACTIVE_KEY, DEFAULT_ID);
  return groups;
}

// --- Public API ---

export function getGroups(): WatchlistGroup[] {
  return ensureMigrated();
}

export function getActiveGroupId(): string {
  ensureMigrated();
  return localStorage.getItem(ACTIVE_KEY) || DEFAULT_ID;
}

export function setActiveGroupId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getGroupItems(groupId: string): WatchItem[] {
  ensureMigrated();
  return readItems(groupId);
}

export function addGroup(name: string): WatchlistGroup {
  const groups = getGroups();
  const id = `g_${Date.now()}`;
  const g = { id, name };
  groups.push(g);
  saveGroups(groups);
  saveItems(id, []);
  return g;
}

export function renameGroup(groupId: string, name: string) {
  const groups = getGroups();
  const g = groups.find((g) => g.id === groupId);
  if (g) {
    g.name = name;
    saveGroups(groups);
  }
}

export function deleteGroup(groupId: string) {
  if (groupId === DEFAULT_ID) return;
  const groups = getGroups().filter((g) => g.id !== groupId);
  saveGroups(groups);
  localStorage.removeItem(itemsKey(groupId));
  if (getActiveGroupId() === groupId) {
    setActiveGroupId(groups[0]?.id ?? DEFAULT_ID);
  }
}

export function reorderGroups(ids: string[]) {
  const groups = getGroups();
  const byId = new Map(groups.map((g) => [g.id, g]));
  const reordered = ids.map((id) => byId.get(id)).filter(Boolean) as WatchlistGroup[];
  saveGroups(reordered);
}

export function addItemToGroup(groupId: string, type: WatchType, code: string): WatchItem[] {
  const items = readItems(groupId);
  if (!items.some((i) => i.type === type && i.code === code)) {
    items.push({ type, code });
    saveItems(groupId, items);
  }
  return items;
}

export function removeItemFromGroup(groupId: string, type: WatchType, code: string): WatchItem[] {
  const items = readItems(groupId).filter((i) => !(i.type === type && i.code === code));
  saveItems(groupId, items);
  return items;
}

export function isItemInGroup(groupId: string, type: WatchType, code: string): boolean {
  return readItems(groupId).some((i) => i.type === type && i.code === code);
}

export function getAllItems(): WatchItem[] {
  const groups = getGroups();
  const seen = new Set<string>();
  const all: WatchItem[] = [];
  for (const g of groups) {
    for (const item of readItems(g.id)) {
      const key = `${item.type}:${item.code}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(item);
      }
    }
  }
  return all;
}
