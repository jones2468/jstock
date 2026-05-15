// 每檔股票自訂本益比門檻
// - cheap   ：低於此 → 便宜（綠）
// - fair    ：合理價中軸（顯示用，例 15/20/25 的 20）
// - expensive：高於此 → 偏貴（紅）
// 中間 → 合理（黃）

export interface PELevels {
  cheap: number;
  fair: number;
  expensive: number;
}

export const DEFAULT_PE_LEVELS: PELevels = {
  cheap: 15,
  fair: 20,
  expensive: 25,
};

const STORAGE_KEY = "jstock_pe_levels";

type Store = Record<string, PELevels>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(s: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("jstock-pe-levels-change"));
}

export function getPELevels(code: string): PELevels {
  const s = readStore();
  return s[code] ?? DEFAULT_PE_LEVELS;
}

export function isCustomPELevels(code: string): boolean {
  return readStore()[code] != null;
}

export function setPELevels(code: string, levels: PELevels) {
  const s = readStore();
  s[code] = levels;
  writeStore(s);
}

export function resetPELevels(code: string) {
  const s = readStore();
  delete s[code];
  writeStore(s);
}

// 讀整張表（觀察清單一次拿）
export function getAllPELevels(): Store {
  return readStore();
}
