import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";

interface Section {
  id: string;
  title: string;
  blocks: Array<{ heading: string; body: string }>;
}

const SECTIONS: Section[] = [
  {
    id: "signals",
    title: "訊號燈（觀察清單）",
    blocks: [
      {
        heading: "原理",
        body: "綜合三個維度給每檔股票一顆燈：(1) 本益比（依你設定的門檻評等便宜/合理/偏貴）、(2) 近 5 日三大法人買賣超合計、(3) 近 14 日 ETF 加減碼動向。任一維度紅燈 → 整體紅；無紅且任一綠 → 整體綠；其他 → 黃。",
      },
      {
        heading: "怎麼解讀",
        body: "紅燈代表至少一項警示需要注意，不等於「該賣」；綠燈也不等於「該買」。它是「值得花時間看一下」的篩子。Hover 燈點可看三項各自細節。",
      },
      {
        heading: "如何用",
        body: "預設按訊號優先排序，讓紅燈先冒出來。需要按單一指標看時，點欄位標題切換排序方向。",
      },
    ],
  },
  {
    id: "pe-levels",
    title: "本益比門檻",
    blocks: [
      {
        heading: "原理",
        body: "P/E（本益比）= 股價 ÷ 近四季 EPS。同樣 P/E 在不同產業意義不同：傳產 15 倍可能偏貴、半導體 25 倍可能算便宜。系統預設用 15 / 20 / 25 三檔，但你可以為每檔股票自訂。",
      },
      {
        heading: "怎麼解讀",
        body: "P/E 低於「便宜值」→ 綠（相對便宜）；高於「偏貴值」→ 紅（相對昂貴）；中間 → 黃（合理區間）。「合理（中軸）」用來抓估算目標價的中位數。",
      },
      {
        heading: "如何用",
        body: "在個股頁的研判總覽展開「本益比門檻」設定。建議參考該股近 5 年歷史 P/E 區間，例如歷史均值 18、區間 12–28，可設便宜 12 / 合理 18 / 偏貴 28。設定會立刻同步到觀察清單的訊號燈與合理價估算。",
      },
    ],
  },
  {
    id: "ma",
    title: "均線（MA5 / MA20 / MA60）",
    blocks: [
      {
        heading: "原理",
        body: "移動平均線（Moving Average）= 過去 N 天收盤價的算術平均。MA5（週線）反映短期動能、MA20（月線）反映中期趨勢、MA60（季線）代表大資金成本與多空分水嶺。",
      },
      {
        heading: "怎麼解讀",
        body: "股價站上 MA60 = 多頭、跌破 MA60 = 空頭。MA5 上穿 MA20 = 黃金交叉（短線轉強）；下穿 = 死亡交叉（轉弱）。多條均線「糾結」後突破 = 行情啟動訊號。注意：均線是落後指標，急漲急跌時失效。",
      },
      {
        heading: "如何用",
        body: "回測買賣點時用「站上/跌破 MA60」當粗略多空切換；短線交易用 MA5/MA20 交叉。配合成交量看：突破均線伴隨大量比較有效。",
      },
    ],
  },
  {
    id: "fib",
    title: "黃金切割（Fibonacci 回撤）",
    blocks: [
      {
        heading: "原理",
        body: "取近期最高點與最低點作為波段，畫出 0% / 38.2% / 50% / 61.8% / 100% 五條水平線。這些比例來自費波那契數列，市場心理常在這些位置出現支撐或壓力。本系統取近 180 個交易日的高低點。",
      },
      {
        heading: "怎麼解讀",
        body: "上升趨勢中，股價回撤到 38.2% 是強勢、50% 一般、61.8% 偏弱；跌破 61.8% 視為趨勢扭轉。下跌趨勢反彈到這幾個位置可能遇壓回頭。0% 跟 100% 是極端壓力/支撐。",
      },
      {
        heading: "如何用",
        body: "在走勢圖右側 legend 勾選「黃金切割」即顯示。設停損常用「跌破 61.8%」當訊號。注意：黃金切割是輔助線、不是預測，碰到水平線通常會有「反應」但方向需配合其他指標判斷。",
      },
    ],
  },
  {
    id: "rsi",
    title: "RSI（相對強弱指數）",
    blocks: [
      {
        heading: "原理",
        body: "RSI(14) = 過去 14 天上漲幅度 ÷ 總波動幅度 ×100，值域 0–100。衡量短期超買超賣狀態。",
      },
      {
        heading: "怎麼解讀",
        body: "RSI > 70 = 超買區（短線過熱，但強勢股可長期維持在 70 以上）；RSI < 30 = 超賣區（可能反彈）。RSI 與股價背離（價創新高 RSI 沒創新高）= 動能衰竭警示。",
      },
      {
        heading: "如何用",
        body: "個股走勢圖下方 RSI 子圖。短線進場避免 RSI 已過 70；尋找反彈機會時看 RSI 是否 < 30 + 量縮築底。不要單獨用 RSI 做訊號，配合趨勢。",
      },
    ],
  },
  {
    id: "macd",
    title: "MACD（指數平滑異同移動平均）",
    blocks: [
      {
        heading: "原理",
        body: "MACD(12,26,9)：DIF = EMA12 − EMA26（快慢線差）、DEA = DIF 的 EMA9（訊號線）、Histogram = (DIF − DEA) × 2（柱狀體）。本質上是「短期均線相對長期均線」的動能指標。",
      },
      {
        heading: "怎麼解讀",
        body: "DIF 上穿 DEA = 多頭訊號（柱狀翻紅）；下穿 = 空頭訊號（翻綠）。柱狀體愈長代表動能愈強。價量背離（價創新高 MACD 沒）= 上漲動能衰竭。零軸上方為多頭格局、下方為空頭格局。",
      },
      {
        heading: "如何用",
        body: "個股走勢圖下方 MACD 子圖。當作中期趨勢確認：MA 均線顯示方向、MACD 確認動能。柱狀體連續縮短 = 注意趨勢轉向。",
      },
    ],
  },
  {
    id: "river",
    title: "估值河流（PE River Chart）",
    blocks: [
      {
        heading: "原理",
        body: "把「股價」跟「EPS × 多個倍數（如 10×, 15×, 20×, 25×）」畫在同一張時間圖上。隨著 EPS 變化，這些倍數線會像河流一樣起伏。",
      },
      {
        heading: "怎麼解讀",
        body: "股價落在低倍數線下方 = 相對便宜；落在高倍數線上方 = 相對昂貴。當 EPS 成長時整條河往上抬，即使股價沒漲，相對估值也會變便宜。",
      },
      {
        heading: "如何用",
        body: "看「目前股價站在河的哪一層」，並觀察過去幾年股價多數時間落在哪幾條線之間 → 那就是市場給這檔股票的「常態估值區間」。",
      },
    ],
  },
  {
    id: "eps",
    title: "EPS / 估值",
    blocks: [
      {
        heading: "原理",
        body: "每股盈餘（EPS）= 稅後淨利 ÷ 流通股數。最新四季加總稱「trailing 4Q EPS」，是估值的常用分母。本系統取自公開資訊觀測站（MOPS）季報。",
      },
      {
        heading: "怎麼解讀",
        body: "看趨勢比看單季數字重要：YoY（同期年增）正成長代表本業強化；連續多季衰退是警訊。同時看營收、營業利益、稅前淨利能驗證 EPS 成長是否來自本業（不是業外）。",
      },
      {
        heading: "如何用",
        body: "用近四季合計 EPS × 你設定的本益比門檻 = 估算合理價。例如 EPS 10 元、合理 P/E 20 → 合理價約 200 元。下方目標價試算器可手動輸入「預估未來 EPS」做情境分析（保守 / 合理 / 樂觀）。",
      },
    ],
  },
  {
    id: "institutional",
    title: "三大法人",
    blocks: [
      {
        heading: "原理",
        body: "外資、投信、自營商每日買賣超公開資料，由 TWSE / TPEX 公告。本系統呈現近 60 個交易日的明細。",
      },
      {
        heading: "怎麼解讀",
        body: "外資是台股最大資金來源，連續性買超/賣超較有訊號意義。投信常領先發動中小型股行情。自營商部位變化快、訊號雜訊高，僅供參考。注意：單日數字會被一筆大單拉歪，看 5–20 日累積比較準。",
      },
      {
        heading: "如何用",
        body: "觀察清單顯示「近 5 日合計」，超過 ±1 億判為買超/賣超訊號。配合走勢圖：法人持續買超 + 股價未漲 = 累積期；法人賣超 + 股價急跌 = 風險訊號。",
      },
    ],
  },
  {
    id: "margin",
    title: "融資融券",
    blocks: [
      {
        heading: "原理",
        body: "融資 = 散戶借錢買股（看多），融券 = 散戶借股放空（看空）。融資餘額太高代表散戶過度樂觀，融券餘額太高代表市場過度悲觀（或軋空可能性）。",
      },
      {
        heading: "怎麼解讀",
        body: "融資使用率（融資餘額 / 融資上限）超過 30% 偏高、超過 50% 警示。融資增加 + 股價漲 = 散戶追高；融資減少 + 股價漲 = 健康籌碼換手。融券放空 + 股價突然漲 = 軋空可能。",
      },
      {
        heading: "如何用",
        body: "搭配三大法人對照看：法人賣超 + 散戶融資增加 = 散戶接刀的警示型態。融資使用率列在個股頁上方供快速判讀。",
      },
    ],
  },
  {
    id: "revenue",
    title: "月營收",
    blocks: [
      {
        heading: "原理",
        body: "上市櫃公司每月 10 號前公告上月營收。YoY 與 MoM 分別比較去年同月與上月變化，是領先指標（早於季報的 EPS 揭露 1-2 個月）。",
      },
      {
        heading: "怎麼解讀",
        body: "看 YoY 比 MoM 重要（季節性影響大）：連續 3 個月 YoY 雙位數成長 → 動能強；連續衰退 → 警示。累計營收 YoY 是更平滑的長期指標。",
      },
      {
        heading: "如何用",
        body: "EPS 公布前先用月營收推估方向：營收高速成長但毛利率穩 → EPS 也會跟著上來。注意一次性訂單（例如國防、政府專案）會讓單月暴衝但無延續性。",
      },
    ],
  },
  {
    id: "etf-holdings",
    title: "ETF 持倉",
    blocks: [
      {
        heading: "原理",
        body: "顯示有哪些主動式 ETF 持有這檔股票、持股權重，並追蹤近期 ETF 是否新增/移除這檔股票。資料來源：MoneyDJ 每日爬取。",
      },
      {
        heading: "怎麼解讀",
        body: "被多檔主動式 ETF 同時加碼 = 法人共識；被多檔同時減碼 = 共識性退出。權重變化比進出更敏感（部位調整通常先於完全進出）。",
      },
      {
        heading: "如何用",
        body: "觀察清單的「ETF 動向」欄顯示近 14 日 +X / -Y 檔變化。首頁「同步加碼/減碼 TOP 5」雷達面板用來發掘觀察清單外的潛在標的。",
      },
    ],
  },
  {
    id: "market-temp",
    title: "大盤溫度計",
    blocks: [
      {
        heading: "原理",
        body: "綜合大盤指數、成交量、漲跌家數、外資買賣超、M1B 月增率等多個指標，計算當前市場是「過熱」、「中性」或「冰冷」。",
      },
      {
        heading: "怎麼解讀",
        body: "過熱（紅）：避免追高、可降低部位；冰冷（綠）：恐慌中往往有機會、可分批佈局；中性（黃）：依個股訊號操作即可。注意：這是中期氣氛指標，不是短線時機。",
      },
      {
        heading: "如何用",
        body: "進場前先看溫度，避免在過熱頂部加碼。M1B 月增率是央行公佈的廣義貨幣（活儲）流通指標，反映市場資金鬆緊。",
      },
    ],
  },
  {
    id: "target-price",
    title: "目標價試算",
    blocks: [
      {
        heading: "原理",
        body: "目標價 = 預估 EPS × 預估本益比。系統提供保守 / 合理 / 樂觀三種情境讓你輸入不同 EPS 與 P/E 倍數，自動換算對應目標價與相對現價的漲跌幅。",
      },
      {
        heading: "怎麼解讀",
        body: "保守情境通常用低 P/E（如 12 倍）+ 低估 EPS，當作下檔保護；樂觀情境用高 P/E（如 25 倍）+ 高估 EPS。實際投資以合理情境為主，極端情境用來界定風險報酬比。",
      },
      {
        heading: "如何用",
        body: "在 EPS / 估值頁面展開試算器，自行輸入預估 EPS。預估方式：法人預估值、自行用近 4 季外推、或用月營收外推。",
      },
    ],
  },
];

export function GuidePage() {
  const [openId, setOpenId] = useState<string | null>(SECTIONS[0].id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold">使用說明</h1>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        本站所有技術分析指標的原理、解讀方式與實際操作建議。請以投資前的「自我研究」為目的使用，
        不構成任何買賣建議。
      </p>

      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const open = openId === s.id;
          return (
            <div
              key={s.id}
              className="overflow-hidden rounded-lg border border-border bg-surface-secondary"
            >
              <button
                onClick={() => setOpenId(open ? null : s.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-surface"
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 text-accent" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
                <span>{s.title}</span>
              </button>

              {open && (
                <div className="space-y-4 border-t border-border/60 px-4 py-4">
                  {s.blocks.map((b) => (
                    <div key={b.heading}>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
                        {b.heading}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-300">{b.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-slate-600">
        指標來源：TWSE / TPEX / MOPS / MoneyDJ / 央行統計。所有數據僅供參考，不代表投資建議。
      </p>
    </div>
  );
}
