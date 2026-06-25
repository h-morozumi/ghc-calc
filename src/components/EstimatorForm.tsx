import { pricing } from "@/data/pricing";
import { useI18n } from "@/i18n";
import type { Scenario } from "@/lib/share";
import type { UserSegment } from "@/lib/calc";
import type { PlanId } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

interface Props {
  scenario: Scenario;
  onChange: (patch: Partial<Scenario>) => void;
}

const currencyOptions = [pricing.fx.base, ...Object.keys(pricing.fx.rates)];

export function EstimatorForm({ scenario, onChange }: Props) {
  const { t } = useI18n();

  const updateSegment = (id: string, patch: Partial<UserSegment>) => {
    onChange({
      segments: scenario.segments.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  };

  const addSegment = () => {
    const seg: UserSegment = {
      id: crypto.randomUUID(),
      label: "New",
      count: 1,
      creditsPerMonth: 1000,
    };
    onChange({ segments: [...scenario.segments, seg] });
  };

  const removeSegment = (id: string) => {
    onChange({ segments: scenario.segments.filter((s) => s.id !== id) });
  };

  const assigned = scenario.segments.reduce(
    (sum, s) => sum + (Number(s.count) || 0),
    0,
  );

  const displayCurrency = scenario.targetCurrency ?? pricing.fx.base;
  const bundledRate = pricing.fx.rates[displayCurrency];
  const showFxEditor =
    displayCurrency !== pricing.fx.base && bundledRate != null;
  const fxOverridden =
    typeof scenario.fxRate === "number" &&
    Number.isFinite(scenario.fxRate) &&
    scenario.fxRate > 0;
  const fxRateValue = fxOverridden ? scenario.fxRate : bundledRate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("form.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("form.plan")}</Label>
            <Select
              value={scenario.planId}
              onValueChange={(v) => onChange({ planId: v as PlanId })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pricing.plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="seats">{t("form.seats")}</Label>
            <Input
              id="seats"
              type="number"
              min={0}
              value={scenario.seats}
              onChange={(e) =>
                onChange({ seats: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("form.currency")}</Label>
            <Select
              value={scenario.targetCurrency ?? pricing.fx.base}
              onValueChange={(v) => onChange({ targetCurrency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="promo">{t("form.promo")}</Label>
            <label className="flex items-center gap-2 h-9 text-sm">
              <input
                id="promo"
                type="checkbox"
                className="size-4 accent-primary"
                checked={scenario.includePromo}
                onChange={(e) => onChange({ includePromo: e.target.checked })}
              />
              <span className="text-muted-foreground">{t("form.promoHint")}</span>
            </label>
          </div>
        </div>

        {showFxEditor && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 min-h-8">
              <Label htmlFor="fx-rate">{t("form.fxRate")}</Label>
              {fxOverridden && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ fxRate: undefined })}
                >
                  <RotateCcw className="size-4" />
                  {t("form.fxRateReset")}
                </Button>
              )}
            </div>
            <Input
              id="fx-rate"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={fxRateValue ?? ""}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({
                  fxRate:
                    e.target.value !== "" && Number.isFinite(v) && v > 0
                      ? v
                      : undefined,
                });
              }}
            />
            <CardDescription>{t("form.fxRateHint")}</CardDescription>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <Label>{t("seg.title")}</Label>
            <CardDescription className="mt-1">{t("seg.hint")}</CardDescription>
          </div>

          <div className="flex flex-col gap-2">
            <div className="hidden sm:grid grid-cols-[1fr_90px_140px_40px] gap-2 text-xs text-muted-foreground px-1">
              <span>{t("seg.label")}</span>
              <span>{t("seg.count")}</span>
              <span>{t("seg.credits")}</span>
              <span />
            </div>
            {scenario.segments.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-2 sm:grid-cols-[1fr_90px_140px_40px] gap-2 items-center"
              >
                <Input
                  value={s.label}
                  onChange={(e) => updateSegment(s.id, { label: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  value={s.count}
                  onChange={(e) =>
                    updateSegment(s.id, {
                      count: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  value={s.creditsPerMonth}
                  onChange={(e) =>
                    updateSegment(s.id, {
                      creditsPerMonth: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("seg.remove")}
                  onClick={() => removeSegment(s.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addSegment}>
              <Plus className="size-4" />
              {t("seg.add")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("seg.assigned")}: {assigned}
              {assigned !== scenario.seats && (
                <span className="text-destructive">
                  {" "}
                  ({t("seg.seatsMismatch")})
                </span>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
