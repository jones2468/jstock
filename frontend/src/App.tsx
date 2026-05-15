import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { ETFDetailPage } from "@/pages/ETFDetailPage";
import { StockLookupPage } from "@/pages/StockLookupPage";
import { WatchlistPage } from "@/pages/WatchlistPage";
import { MarketTempPage } from "@/pages/MarketTempPage";
import { GuidePage } from "@/pages/GuidePage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<WatchlistPage />} />
        <Route path="/market" element={<MarketTempPage />} />
        <Route path="/etf-dashboard" element={<DashboardPage />} />
        <Route path="/etf/:code" element={<ETFDetailPage />} />
        <Route path="/stock/:code" element={<StockLookupPage />} />
        <Route path="/guide" element={<GuidePage />} />
        {/* legacy paths */}
        <Route path="/watchlist" element={<Navigate to="/" replace />} />
        <Route path="/radar" element={<Navigate to="/" replace />} />
        <Route path="/overlap" element={<Navigate to="/etf-dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
