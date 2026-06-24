import { useI18n } from "@/i18n";
import { estimate } from "@/lib/calc";
import type { Scenario } from "@/lib/share";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Props {
  scenario: Scenario;
}

function Row({
  label,
  value,
  strong,
  muted,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-destructive"
        : "";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span
        className={`tabular-nums ${strong ? "font-semibold" : ""} ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

export function ResultSummary({ scenario }: Props) {
  const { t, locale } = useI18n();
  const r = estimate(scenario);
  const cur = r.targetCurrency ?? r.currency;
  const rate = r.fxRate ?? 1;
  const money = (usd: number) => formatCurrency(usd * rate, cur, locale);
  const credits = (n: number) =>
    `${formatNumber(n, locale)} ${t("result.credits")}`;

  const over = r.overageCredits > 0;
  const ppp = r.ppp;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("result.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Row
            label={t("result.perSeatIncluded")}
            value={credits(r.includedCreditsPerSeat)}
            muted
          />
          {r.promoCreditsPerSeat > 0 && (
            <Row
              label={t("result.promoCredits")}
              value={`+${credits(r.promoCreditsPerSeat)}`}
              muted
            />
          )}
          <Row
            label={t("result.includedPool")}
            value={credits(r.totalIncludedCredits)}
          />
          <Row
            label={t("result.consumed")}
            value={credits(r.totalConsumedCredits)}
          />
          <div
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              over
                ? "bg-destructive/10 text-destructive"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {over
              ? `${t("result.overPool")} · ${t("result.overageCredits")}: ${formatNumber(r.overageCredits, locale)}`
              : t("result.underPool")}
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Row label={t("result.seatCost")} value={money(r.seatCostMonthly)} />
          <Row
            label={t("result.overageCost")}
            value={money(r.overageCostMonthly)}
          />
          <Row
            label={t("result.paygMonthly")}
            value={money(r.paygMonthly)}
            strong
          />
          <Row
            label={t("result.paygAnnual")}
            value={money(r.paygAnnual)}
            muted
          />
        </div>

        {ppp && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold">
                {t("ppp.title")} · {ppp.tierId.toUpperCase()} ×{ppp.quantity} (
                {ppp.discountPct}%)
              </div>
              <Row
                label={t("ppp.committed")}
                value={money(ppp.committedUsd)}
                muted
              />
              <Row
                label={t("ppp.covered")}
                value={money(ppp.coveredAnnualUsd)}
                muted
              />
              {ppp.uncoveredAnnualUsd > 0 && (
                <Row
                  label={t("ppp.uncovered")}
                  value={money(ppp.uncoveredAnnualUsd)}
                  tone="negative"
                />
              )}
              {ppp.wastedUsd > 0 && (
                <Row
                  label={t("ppp.wasted")}
                  value={money(ppp.wastedUsd)}
                  tone="negative"
                />
              )}
              <Row
                label={t("ppp.upfront")}
                value={money(ppp.upfrontUsd)}
                strong
              />
              <Row
                label={t("ppp.savings")}
                value={`${ppp.savingsUsd >= 0 ? "" : "-"}${money(Math.abs(ppp.savingsUsd))}`}
                tone={ppp.savingsUsd >= 0 ? "positive" : "negative"}
              />
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-col gap-1">
          {ppp ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("ppp.upfrontDueNow")}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {money(ppp.upfrontUsd)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("ppp.effectiveAnnual")}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {money(ppp.effectiveAnnualUsd)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("ppp.effectiveMonthly")}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {money(ppp.effectiveMonthlyUsd)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("result.totalMonthly")}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {money(r.paygMonthly)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("result.totalAnnual")}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {money(r.paygAnnual)}
                </span>
              </div>
            </>
          )}
          {r.targetCurrency && r.targetCurrency !== r.currency && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("result.fxNote")}: 1 {r.currency} = {r.fxRate}{" "}
              {r.targetCurrency}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-3">
          {t("result.disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
