import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { ETFDetailPage } from "@/pages/ETFDetailPage";
import { RadarPage } from "@/pages/RadarPage";
import { OverlapPage } from "@/pages/OverlapPage";
import { StockLookupPage } from "@/pages/StockLookupPage";
import { WatchlistPage } from "@/pages/WatchlistPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/etf/:code" element={<ETFDetailPage />} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/overlap" element={<OverlapPage />} />
        <Route path="/stock/:code" element={<StockLookupPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
      </Routes>
    </AppShell>
  );
}
