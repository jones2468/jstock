import { Search } from "lucide-react";

export function WelcomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Search className="mx-auto mb-4 h-12 w-12 text-slate-600" />
        <h2 className="mb-2 text-lg font-semibold text-slate-300">
          選擇一檔股票開始
        </h2>
        <p className="text-sm text-slate-500">
          從左側自選清單點選，或用上方搜尋框查找
        </p>
      </div>
    </div>
  );
}
