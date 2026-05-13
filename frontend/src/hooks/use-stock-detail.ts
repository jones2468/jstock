import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface InstitutionalRow {
  trade_date: string;
  foreign_buy: number | null;
  foreign_sell: number | null;
  foreign_net: number | null;
  invest_buy: number | null;
  invest_sell: number | null;
  invest_net: number | null;
  dealer_buy: number | null;
  dealer_sell: number | null;
  dealer_net: number | null;
  total_net: number | null;
}

export interface MarginRow {
  trade_date: string;
  margin_buy: number | null;
  margin_sell: number | null;
  margin_redeem: number | null;
  margin_balance: number | null;
  margin_limit: number | null;
  short_sell: number | null;
  short_buy: number | null;
  short_redeem: number | null;
  short_balance: number | null;
  short_limit: number | null;
}

export interface RevenueRow {
  report_year: number;
  report_month: number;
  revenue: number | null;
  yoy_pct: number | null;
  mom_pct: number | null;
  ytd_revenue: number | null;
  ytd_yoy_pct: number | null;
}

export function useInstitutional(code: string, days = 60) {
  return useQuery({
    queryKey: ["institutional", code, days],
    queryFn: () =>
      apiFetch<InstitutionalRow[]>(
        `/api/v1/stocks/${code}/institutional?days=${days}`
      ),
    enabled: !!code,
  });
}

export function useMargin(code: string, days = 60) {
  return useQuery({
    queryKey: ["margin", code, days],
    queryFn: () =>
      apiFetch<MarginRow[]>(`/api/v1/stocks/${code}/margin?days=${days}`),
    enabled: !!code,
  });
}

export function useRevenue(code: string, months = 24) {
  return useQuery({
    queryKey: ["revenue", code, months],
    queryFn: () =>
      apiFetch<RevenueRow[]>(`/api/v1/stocks/${code}/revenue?months=${months}`),
    enabled: !!code,
  });
}

/* ---- Phase C: EPS & Valuation ---- */

export interface EPSRow {
  report_year: number;
  report_quarter: number;
  eps: number | null;
  revenue: number | null;
  operating_income: number | null;
  pre_tax_income: number | null;
  net_income: number | null;
}

export interface ValuationData {
  stock_code: string;
  current_price: number | null;
  price_date: string | null;
  trailing_eps: number | null;
  trailing_pe: number | null;
  eps_quarters: EPSRow[];
  institutional_net_5d: number | null;
  etf_count: number;
  etf_add_14d: number;
  etf_remove_14d: number;
}

export function useQuarterlyEPS(code: string, quarters = 12) {
  return useQuery({
    queryKey: ["eps", code, quarters],
    queryFn: () =>
      apiFetch<EPSRow[]>(`/api/v1/stocks/${code}/eps?quarters=${quarters}`),
    enabled: !!code,
  });
}

export function useValuation(code: string) {
  return useQuery({
    queryKey: ["valuation", code],
    queryFn: () =>
      apiFetch<ValuationData>(`/api/v1/stocks/${code}/valuation`),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
}
