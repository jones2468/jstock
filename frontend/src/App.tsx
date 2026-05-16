import { Routes, Route, Navigate } from "react-router-dom";
import { StockShell, SimpleShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { ETFDetailPage } from "@/pages/ETFDetailPage";
import { StockLookupPage } from "@/pages/StockLookupPage";
import { WelcomePage } from "@/pages/WelcomePage";
import { MarketTempPage } from "@/pages/MarketTempPage";
import { GuidePage } from "@/pages/GuidePage";
import { GroupActivator } from "@/pages/GroupActivator";

export default function App() {
  return (
    <Routes>
      {/* 三欄佈局：群組 tabs + 股票清單 + 主內容 */}
      <Route element={<StockShell />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/watchlist/:groupId" element={<GroupActivator />} />
        <Route path="/stock/:code" element={<StockLookupPage />} />
      </Route>

      {/* 簡潔佈局：群組 tabs + 主內容 */}
      <Route element={<SimpleShell />}>
        <Route path="/market" element={<MarketTempPage />} />
        <Route path="/etf-dashboard" element={<DashboardPage />} />
        <Route path="/etf/:code" element={<ETFDetailPage />} />
        <Route path="/guide" element={<GuidePage />} />
      </Route>

      {/* legacy redirects */}
      <Route path="/watchlist" element={<Navigate to="/" replace />} />
      <Route path="/radar" element={<Navigate to="/" replace />} />
      <Route path="/overlap" element={<Navigate to="/etf-dashboard" replace />} />
    </Routes>
  );
}
