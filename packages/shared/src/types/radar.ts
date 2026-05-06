export interface RadarItem {
  stock_code: string;
  stock_name: string;
  etf_codes: string[];
  etf_names: string[];
  weight_pct?: number;
}

export interface SyncSignal {
  stock_code: string;
  stock_name: string;
  etf_count: number;
  etfs: Array<{
    etf_code: string;
    etf_name: string;
    diff_type: string;
    weight_change: number | null;
  }>;
}

export interface InstitutionalTrend {
  date: string;
  total_shares: number;
  etf_count: number;
}

export interface OverlapResult {
  etf_codes: string[];
  common_stocks: Array<{
    stock_code: string;
    stock_name: string;
    weights: Record<string, number>;
  }>;
  overlap_count: number;
}

export interface OverlapMatrixEntry {
  etf_a: string;
  etf_b: string;
  overlap_count: number;
}
