import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function TopBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/stock/${q}`);
      setQuery("");
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-surface-secondary px-4">
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋股票代碼或名稱..."
          className="w-full rounded-md border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-accent"
        />
      </form>
      <div className="text-xs text-slate-500">
        主動式 ETF 每日自動監測
      </div>
    </header>
  );
}
