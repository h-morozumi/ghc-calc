import * as React from "react";

export type Lang = "en" | "ja";

type Dict = Record<string, string>;

const en: Dict = {
  "app.title": "GitHub Copilot Cost Estimator",
  "app.subtitle":
    "Simulate and estimate GitHub Copilot Business & Enterprise costs.",
  "nav.share": "Copy share link",
  "nav.copied": "Link copied!",
  "nav.print": "Print / PDF",
  "nav.language": "Language",

  "form.title": "Inputs",
  "form.plan": "Plan",
  "form.business": "Copilot Business",
  "form.enterprise": "Copilot Enterprise",
  "form.seats": "Seats",
  "form.promo": "Include promotional extra credits",
  "form.promoHint": "Applies when today falls within an active promotion window.",
  "form.currency": "Display currency",

  "seg.title": "Per-user AI Credit allocation",
  "seg.hint":
    "Split your users into buckets by monthly AI Credit usage. Credits are pooled across all seats.",
  "seg.add": "Add segment",
  "seg.label": "Label",
  "seg.count": "Users",
  "seg.credits": "Credits / user / month",
  "seg.remove": "Remove",
  "seg.assigned": "Allocated users",
  "seg.seatsMismatch": "differs from seat count",

  "ppp.title": "Pre-Purchase Plan (PPP)",
  "ppp.note":
    "PPP = GitHub Pre-Purchase Plan. Pick a published tier and buy it in whole-number multiples (quantity): P1 = 20,000 CU ($19,000, 5% off), P2 = 100,000 CU ($90,000, 10% off), P3 = 500,000 CU ($425,000, 15% off). 1 CU = $1 of GitHub usage, prepaid for a one-year term. Usage beyond your total commitment is billed pay-as-you-go and unused units do not carry over. Pricing as of June 2026 and subject to change. Pre-Purchase discounts do not combine with other discounts.",
  "ppp.enable": "Apply a Pre-Purchase Plan (upfront prepayment)",
  "ppp.tier": "Tier",
  "ppp.quantity": "Quantity",
  "ppp.fitQuantity": "Fit to annual usage",
  "ppp.committedUnits": "Committed units",
  "ppp.purchasePrice": "Purchase price (due now)",
  "ppp.tierLabel.p1": "P1 — 20,000 CU / 5% off",
  "ppp.tierLabel.p2": "P2 — 100,000 CU / 10% off",
  "ppp.tierLabel.p3": "P3 — 500,000 CU / 15% off",
  "ppp.committed": "Committed (retail value)",
  "ppp.covered": "Usage covered by commitment",
  "ppp.uncovered": "Uncovered usage (pay-as-you-go)",
  "ppp.wasted": "Unused prepaid value",
  "ppp.upfront": "Upfront payment",
  "ppp.savings": "Savings vs. pay-as-you-go (yr)",
  "ppp.upfrontDueNow": "Upfront payment (due now)",
  "ppp.effectiveAnnual": "Effective cost / year",
  "ppp.effectiveMonthly": "Effective cost / month",

  "result.title": "Estimate",
  "result.perSeatIncluded": "Included credits / seat",
  "result.promoCredits": "Promo credits / seat",
  "result.includedPool": "Total included pool",
  "result.consumed": "Estimated consumption",
  "result.overageCredits": "Overage credits",
  "result.assignedUsers": "Allocated users",
  "result.seatCost": "Seat cost",
  "result.overageCost": "Overage cost",
  "result.subtotal": "Subtotal",
  "result.pppDiscount": "PPP discount",
  "result.paygMonthly": "Pay-as-you-go / month",
  "result.paygAnnual": "Pay-as-you-go / year",
  "result.totalMonthly": "Total / month",
  "result.totalAnnual": "Total / year",
  "result.fxNote": "FX rate",
  "result.disclaimer":
    "Unofficial, community-maintained figures. Prices are best-effort and may lag behind GitHub's official numbers. Verify against the official documentation before purchasing.",
  "result.underPool": "Within included pool",
  "result.overPool": "Exceeds included pool",
  "result.credits": "credits",

  "compare.title": "Business vs. Enterprise",
  "compare.monthly": "Monthly",
  "compare.annual": "Annual",
  "compare.cheaper": "Lower cost for this usage",

  "chart.poolTitle": "Consumption vs. included pool (monthly)",
  "chart.included": "Included pool",
  "chart.consumed": "Consumed",
  "chart.costTitle": "Total cost by plan",

  "disclaimer.title": "Disclaimer",
  "footer.note":
    "Unofficial tool. Not affiliated with GitHub, Inc. Verify prices against official documentation.",
};

const ja: Dict = {
  "app.title": "GitHub Copilot 見積もりツール",
  "app.subtitle":
    "GitHub Copilot Business / Enterprise の料金をシミュレーション・コスト算出します。",
  "nav.share": "共有リンクをコピー",
  "nav.copied": "コピーしました！",
  "nav.print": "印刷 / PDF",
  "nav.language": "言語",

  "form.title": "入力",
  "form.plan": "プラン",
  "form.business": "Copilot Business",
  "form.enterprise": "Copilot Enterprise",
  "form.seats": "シート数",
  "form.promo": "期間限定の追加クレジットを含める",
  "form.promoHint": "本日が有効なプロモ期間内の場合に適用されます。",
  "form.currency": "表示通貨",

  "seg.title": "ユーザー別 AI Credit 配分",
  "seg.hint":
    "月間の AI Credit 使用量でユーザーを分類します。クレジットは全シートでプール共有されます。",
  "seg.add": "セグメント追加",
  "seg.label": "ラベル",
  "seg.count": "人数",
  "seg.credits": "クレジット / 人 / 月",
  "seg.remove": "削除",
  "seg.assigned": "配分済み人数",
  "seg.seatsMismatch": "シート数と不一致",

  "ppp.title": "Pre-Purchase Plan（PPP）",
  "ppp.note":
    "PPP = GitHub Pre-Purchase Plan。公開ティアを選び、整数の数量でまとめ買いします: P1 = 20,000 CU（$19,000・5%オフ）、P2 = 100,000 CU（$90,000・10%オフ）、P3 = 500,000 CU（$425,000・15%オフ）。1 CU = $1 相当の GitHub 利用料を1年契約で前払い。コミット合計を超えた分は従量課金、未使用分は翌期に繰り越せません。料金は2026年6月時点で変更される場合があります。Pre-Purchase 割引は他割引と併用できません。",
  "ppp.enable": "Pre-Purchase Plan を適用する（前払い）",
  "ppp.tier": "ティア",
  "ppp.quantity": "数量",
  "ppp.fitQuantity": "年間利用量に合わせる",
  "ppp.committedUnits": "コミットユニット合計",
  "ppp.purchasePrice": "購入額（今支払う）",
  "ppp.tierLabel.p1": "P1 — 20,000 CU / 5%オフ",
  "ppp.tierLabel.p2": "P2 — 100,000 CU / 10%オフ",
  "ppp.tierLabel.p3": "P3 — 500,000 CU / 15%オフ",
  "ppp.committed": "コミット額（額面）",
  "ppp.covered": "コミットでカバーされる利用",
  "ppp.uncovered": "超過利用（従量課金）",
  "ppp.wasted": "未使用の前払い分",
  "ppp.upfront": "前払い支払額",
  "ppp.savings": "従量課金比の節約（年）",
  "ppp.upfrontDueNow": "前払い支払額（今支払う）",
  "ppp.effectiveAnnual": "実効コスト / 年",
  "ppp.effectiveMonthly": "実効コスト / 月",

  "result.title": "見積もり",
  "result.perSeatIncluded": "含有クレジット / シート",
  "result.promoCredits": "プロモクレジット / シート",
  "result.includedPool": "含有クレジット総プール",
  "result.consumed": "推定消費量",
  "result.overageCredits": "超過クレジット",
  "result.assignedUsers": "配分済み人数",
  "result.seatCost": "シート費用",
  "result.overageCost": "超過費用",
  "result.subtotal": "小計",
  "result.pppDiscount": "PPP 割引",
  "result.paygMonthly": "従量課金 / 月",
  "result.paygAnnual": "従量課金 / 年",
  "result.totalMonthly": "合計 / 月",
  "result.totalAnnual": "合計 / 年",
  "result.fxNote": "為替レート",
  "result.disclaimer":
    "非公式・コミュニティ管理の参考値です。料金は最新でない場合があります。契約前に必ず公式ドキュメントでご確認ください。",
  "result.underPool": "含有プール内",
  "result.overPool": "含有プール超過",
  "result.credits": "クレジット",

  "compare.title": "Business と Enterprise の比較",
  "compare.monthly": "月額",
  "compare.annual": "年額",
  "compare.cheaper": "この利用量で割安",

  "chart.poolTitle": "消費量 vs 含有プール（月間）",
  "chart.included": "含有プール",
  "chart.consumed": "消費量",
  "chart.costTitle": "プラン別の合計コスト",

  "disclaimer.title": "免責事項",
  "footer.note":
    "非公式ツールです。GitHub, Inc. とは無関係です。料金は公式ドキュメントでご確認ください。",
};

const dictionaries: Record<Lang, Dict> = { en, ja };

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  locale: string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  lang,
  setLang,
  children,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo<I18nContextValue>(() => {
    const dict = dictionaries[lang];
    return {
      lang,
      setLang,
      t: (key: string) => dict[key] ?? key,
      locale: lang === "ja" ? "ja-JP" : "en-US",
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
