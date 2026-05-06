import { MONEYDJ_HOLDINGS_URL } from "@jstock/shared";

export interface ScrapedHolding {
  stock_code: string;
  stock_name: string;
  weight_pct: number;
  shares: number | null;
}

export async function scrapeHoldings(etfCode: string): Promise<ScrapedHolding[]> {
  const url = MONEYDJ_HOLDINGS_URL(etfCode);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; jstock/1.0)",
      Accept: "text/html",
    },
  });

  if (!res.ok) {
    throw new Error(`MoneyDJ ${etfCode}: HTTP ${res.status}`);
  }

  const html = await res.text();
  return parseHoldingsHtml(html);
}

export function parseHoldingsHtml(html: string): ScrapedHolding[] {
  const holdings: ScrapedHolding[] = [];

  // Each row pattern:
  // <td class="col05"><a href='...etfid=2454.TW&...'>聯發科(2454.TW)</a></td>
  // <td class="col06">9.63</td>
  // <td class="col07">14,636,000</td>
  const rowRegex =
    /<td\s+class="col05">\s*<a[^>]*>([^<]+)\((\w+)\.TW\)<\/a>\s*<\/td>\s*<td\s+class="col06">([\d.]+)<\/td>\s*<td\s+class="col07">([\d,.-]+)<\/td>/g;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const stockName = match[1].trim();
    const stockCode = match[2].trim();
    const weightPct = parseFloat(match[3]);
    const sharesStr = match[4].replace(/,/g, "");
    const shares = sharesStr && sharesStr !== "-" ? parseInt(sharesStr, 10) : null;

    if (stockCode && !isNaN(weightPct)) {
      holdings.push({
        stock_code: stockCode,
        stock_name: stockName,
        weight_pct: weightPct,
        shares: shares && !isNaN(shares) ? shares : null,
      });
    }
  }

  return holdings;
}
