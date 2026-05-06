export interface ETFMeta {
  code: string;
  name: string;
  issuer: string;
  group: "tw" | "overseas";
}

export const ACTIVE_ETFS: ETFMeta[] = [
  { code: "00878", name: "國泰永續高股息", issuer: "國泰投信", group: "tw" },
  { code: "00919", name: "群益台灣精選高息", issuer: "群益投信", group: "tw" },
  { code: "00929", name: "復華台灣科技優息", issuer: "復華投信", group: "tw" },
  { code: "00934", name: "中信成長高股息", issuer: "中信投信", group: "tw" },
  { code: "00936", name: "台新臺灣永續高息中小", issuer: "台新投信", group: "tw" },
  { code: "00939", name: "統一台灣高息動能", issuer: "統一投信", group: "tw" },
  { code: "00940", name: "元大台灣價值高息", issuer: "元大投信", group: "tw" },
  { code: "00943", name: "兆豐台灣晶圓製造", issuer: "兆豐投信", group: "tw" },
  { code: "00944", name: "野村臺灣趨勢動能高息", issuer: "野村投信", group: "tw" },
  { code: "00946", name: "群益台灣ESG低碳高息", issuer: "群益投信", group: "tw" },

  { code: "00980A", name: "野村全球新興債券基金", issuer: "野村投信", group: "overseas" },
  { code: "00981A", name: "野村全球債券基金", issuer: "野村投信", group: "overseas" },
  { code: "00982A", name: "野村全球高收益債基金", issuer: "野村投信", group: "overseas" },
  { code: "00984A", name: "野村多元收益債券基金", issuer: "野村投信", group: "overseas" },
  { code: "00985A", name: "野村全球短期收益基金", issuer: "野村投信", group: "overseas" },
  { code: "00986A", name: "野村六年到期新興債基金", issuer: "野村投信", group: "overseas" },
  { code: "00987A", name: "野村優質基金", issuer: "野村投信", group: "overseas" },
  { code: "00988A", name: "野村全球多元基金", issuer: "野村投信", group: "overseas" },
  { code: "00952", name: "凱基臺灣非電子高息", issuer: "凱基投信", group: "tw" },
];

export const ETF_CODES = ACTIVE_ETFS.map((e) => e.code);
