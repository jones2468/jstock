const STORAGE_KEY = "jstock_favorites";

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addFavorite(stockCode: string): string[] {
  const favs = getFavorites();
  if (!favs.includes(stockCode)) {
    favs.push(stockCode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  }
  return favs;
}

export function removeFavorite(stockCode: string): string[] {
  const favs = getFavorites().filter((c) => c !== stockCode);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  return favs;
}

export function isFavorite(stockCode: string): boolean {
  return getFavorites().includes(stockCode);
}
