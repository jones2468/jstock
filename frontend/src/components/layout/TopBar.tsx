import { Menu, Search, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearch } from "@/hooks/use-search";
import { useFavorites } from "@/hooks/use-favorites";

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { toggleItem, checkItem } = useFavorites();

  const { data, isLoading } = useGlobalSearch(query);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Enter 時走第一個 hit；無 hit 時當代號 navigate
    const first = data?.stocks?.[0] ?? data?.etfs?.[0];
    if (first) {
      const path = data?.stocks?.length ? `/stock/${first.code}` : `/etf/${first.code}`;
      navigate(path);
    } else {
      navigate(`/stock/${q}`);
    }
    setQuery("");
    setOpen(false);
  }

  function gotoStock(code: string) {
    navigate(`/stock/${code}`);
    setQuery("");
    setOpen(false);
  }

  function gotoEtf(code: string) {
    navigate(`/etf/${code}`);
    setQuery("");
    setOpen(false);
  }

  const hasResults = (data?.stocks?.length ?? 0) + (data?.etfs?.length ?? 0) > 0;

  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-surface-secondary px-3 sm:gap-4 sm:px-4">
      {/* 手機漢堡 */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-400 hover:bg-surface hover:text-slate-200 lg:hidden"
        aria-label="開啟選單"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div ref={wrapRef} className="relative flex-1 max-w-md">
        <form onSubmit={handleSubmit}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="搜尋股票/ETF..."
            className="w-full rounded-md border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-accent"
          />
        </form>

        {open && query.trim().length >= 1 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-auto rounded-md border border-border bg-surface-secondary shadow-lg">
            {isLoading && (
              <div className="px-3 py-2 text-xs text-slate-500">搜尋中...</div>
            )}
            {!isLoading && !hasResults && (
              <div className="px-3 py-2 text-xs text-slate-500">沒有符合的結果</div>
            )}

            {!!data?.stocks?.length && (
              <div>
                <div className="border-b border-border bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  股票 · {data.stocks.length}
                </div>
                {data.stocks.map((s) => {
                  const fav = checkItem("stock", s.code);
                  return (
                    <div
                      key={`s-${s.code}`}
                      className="flex items-center justify-between border-b border-border/40 px-3 py-2 hover:bg-surface"
                    >
                      <button
                        onClick={() => gotoStock(s.code)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm text-slate-200">
                          <span className="text-accent">{s.code}</span>
                          <span className="ml-2">{s.name}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {s.market ?? ""}
                          {s.industry ? ` · ${s.industry}` : ""}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem("stock", s.code);
                        }}
                        className={
                          fav
                            ? "rounded p-1 text-amber-400"
                            : "rounded p-1 text-slate-600 hover:text-amber-400"
                        }
                        title={fav ? "已加入自選" : "加入自選"}
                      >
                        <Star className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!!data?.etfs?.length && (
              <div>
                <div className="border-b border-border bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  ETF · {data.etfs.length}
                </div>
                {data.etfs.map((e) => {
                  const fav = checkItem("etf", e.code);
                  return (
                    <div
                      key={`e-${e.code}`}
                      className="flex items-center justify-between border-b border-border/40 px-3 py-2 hover:bg-surface"
                    >
                      <button
                        onClick={() => gotoEtf(e.code)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm text-slate-200">
                          <span className="text-accent">{e.code}</span>
                          <span className="ml-2">{e.name}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {[e.issuer, e.etf_type, e.market].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggleItem("etf", e.code);
                        }}
                        className={
                          fav
                            ? "rounded p-1 text-amber-400"
                            : "rounded p-1 text-slate-600 hover:text-amber-400"
                        }
                        title={fav ? "已加入自選" : "加入自選"}
                      >
                        <Star className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden text-xs text-slate-500 md:block">台股 / ETF 監測平台</div>
    </header>
  );
}
