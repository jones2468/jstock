export interface StockPrice {
  price_date: string;
  stock_code: string;
  stock_name: string | null;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number;
  volume: number | null;
  change_val: number | null;
}

export interface StockIndicators {
  date: string;
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  rsi: number | null;
  macd_line: number | null;
  signal_line: number | null;
  histogram: number | null;
}

export interface StockSearchResult {
  stock_code: string;
  stock_name: string;
  close_price: number | null;
  change_val: number | null;
}
