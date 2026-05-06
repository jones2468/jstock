export interface ETF {
  etf_code: string;
  etf_name: string;
  issuer: string;
  group_tag: "tw" | "overseas" | "custom";
  aum: number | null;
  updated_at: string;
}

export interface ETFWithSummary extends ETF {
  holding_count: number;
  today_changes: {
    new: number;
    removed: number;
    increased: number;
    decreased: number;
  };
}

export interface Holding {
  stock_code: string;
  stock_name: string;
  weight_pct: number;
  shares: number | null;
}

export interface HoldingWithDiff extends Holding {
  prev_weight_pct: number | null;
  weight_change: number | null;
  diff_type: DiffType | null;
  sparkline: number[];
}

export type DiffType = "new" | "removed" | "increased" | "decreased";

export interface HoldingDiff {
  diff_date: string;
  etf_code: string;
  stock_code: string;
  stock_name: string;
  diff_type: DiffType;
  today_weight: number | null;
  prev_weight: number | null;
  weight_change: number | null;
}
