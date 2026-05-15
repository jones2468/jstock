import { DEFAULT_PE_LEVELS, type PELevels } from "./pe-levels";

export type Signal = "green" | "yellow" | "red" | "gray";

const NEUTRAL_INST_THRESHOLD = 100_000_000; // 5 日法人 ±1 億內視為中性

export function peSignal(
  pe: number | null,
  levels: PELevels = DEFAULT_PE_LEVELS
): Signal {
  if (pe == null || !Number.isFinite(pe)) return "gray";
  if (pe < levels.cheap) return "green";
  if (pe > levels.expensive) return "red";
  return "yellow";
}

export function instSignal(net5d: number | null): Signal {
  if (net5d == null) return "gray";
  if (net5d > NEUTRAL_INST_THRESHOLD) return "green";
  if (net5d < -NEUTRAL_INST_THRESHOLD) return "red";
  return "yellow";
}

export function etfSignal(add14d: number, remove14d: number): Signal {
  if (add14d === 0 && remove14d === 0) return "gray";
  if (add14d > remove14d) return "green";
  if (remove14d > add14d) return "red";
  return "yellow";
}

// 保守原則：任一紅 → 紅；無紅且任一綠 → 綠；其他 → 黃
export function overallSignal(parts: Signal[]): Signal {
  if (parts.some((s) => s === "red")) return "red";
  if (parts.some((s) => s === "green")) return "green";
  if (parts.every((s) => s === "gray")) return "gray";
  return "yellow";
}

export function signalPriority(s: Signal): number {
  switch (s) {
    case "red":
      return 0;
    case "yellow":
      return 1;
    case "green":
      return 2;
    case "gray":
      return 3;
  }
}

export function signalLabel(s: Signal): string {
  switch (s) {
    case "red":
      return "注意";
    case "yellow":
      return "中性";
    case "green":
      return "佳";
    case "gray":
      return "—";
  }
}

export function signalDotClass(s: Signal): string {
  switch (s) {
    case "red":
      return "bg-rose-500";
    case "yellow":
      return "bg-amber-400";
    case "green":
      return "bg-emerald-500";
    case "gray":
      return "bg-slate-600";
  }
}

export function signalTextClass(s: Signal): string {
  switch (s) {
    case "red":
      return "text-rose-400";
    case "yellow":
      return "text-amber-400";
    case "green":
      return "text-emerald-400";
    case "gray":
      return "text-slate-500";
  }
}
