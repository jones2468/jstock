import { useState, useCallback } from "react";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
} from "@/lib/favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(getFavorites);

  const toggle = useCallback((code: string) => {
    if (isFavorite(code)) {
      setFavorites(removeFavorite(code));
    } else {
      setFavorites(addFavorite(code));
    }
  }, []);

  const check = useCallback((code: string) => favorites.includes(code), [favorites]);

  return { favorites, toggle, isFavorite: check };
}
