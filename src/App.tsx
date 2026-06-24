import { useEffect, useState } from "react";
import { I18nProvider, useI18n, type Lang } from "@/i18n";
import { pricing } from "@/data/pricing";
import {
  buildShareUrl,
  getScenarioFromUrl,
  normalizeScenario,
  syncUrl,
  type Scenario,
} from "@/lib/share";
import { EstimatorForm } from "@/components/EstimatorForm";
import { PppPanel } from "@/components/PppPanel";
import { ResultSummary } from "@/components/ResultSummary";
import { Charts } from "@/components/Charts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Link as LinkIcon, Printer } from "lucide-react";

const defaultScenario: Scenario = {
  planId: "business",
  seats: 50,
  segments: [
    { id: "light", label: "Light", count: 30, creditsPerMonth: 800 },
    { id: "standard", label: "Standard", count: 15, creditsPerMonth: 2500 },
    { id: "heavy", label: "Heavy", count: 5, creditsPerMonth: 9000 },
  ],
  includePromo: false,
  ppp: { enabled: false, tierId: "p1", quantity: 1 },
  targetCurrency: "USD",
  lang: "en",
};

function detectLang(): Lang {
  if (typeof navigator !== "undefined" && navigator.language.startsWith("ja")) {
    return "ja";
  }
  return "en";
}

function Header({ copied, onShare }: { copied: boolean; onShare: () => void }) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("app.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("app.subtitle")}</p>
      </div>
      <div className="flex items-center gap-2 no-print">
        <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={onShare}>
          {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
          {copied ? t("nav.copied") : t("nav.share")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t("nav.print")}
        </Button>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-8 pt-6 border-t text-xs text-muted-foreground flex flex-col gap-1">
      <p>{t("footer.note")}</p>
      <p>
        Pricing data v{pricing.version} ·{" "}
        <a
          className="underline"
          href={pricing.source}
          target="_blank"
          rel="noreferrer"
        >
          source
        </a>
      </p>
    </footer>
  );
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario>(() => {
    const fromUrl = getScenarioFromUrl();
    if (fromUrl) {
      return normalizeScenario(fromUrl, {
        ...defaultScenario,
        lang: detectLang(),
      });
    }
    return { ...defaultScenario, lang: detectLang() };
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    syncUrl(scenario);
  }, [scenario]);

  const lang: Lang = scenario.lang === "ja" ? "ja" : "en";
  const setLang = (l: Lang) => setScenario((s) => ({ ...s, lang: l }));
  const onChange = (patch: Partial<Scenario>) =>
    setScenario((s) => ({ ...s, ...patch }));

  const handleShare = async () => {
    const url = buildShareUrl(scenario);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Share URL", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <I18nProvider lang={lang} setLang={setLang}>
      <Header copied={copied} onShare={handleShare} />
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start print-stack">
          <div className="flex flex-col gap-4">
            <EstimatorForm scenario={scenario} onChange={onChange} />
            <PppPanel scenario={scenario} onChange={onChange} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="print-page">
              <ResultSummary scenario={scenario} />
            </div>
            <div className="print-page">
              <Charts scenario={scenario} />
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </I18nProvider>
  );
}
