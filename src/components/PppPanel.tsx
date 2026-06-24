import { useI18n } from "@/i18n";
import type { Scenario } from "@/lib/share";
import {
  estimate,
  getPppTier,
  normalizePppQuantity,
  type PppSelection,
} from "@/lib/calc";
import { pricing } from "@/data/pricing";
import { formatCurrency, formatNumber } from "@/lib/format";
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

interface Props {
  scenario: Scenario;
  onChange: (patch: Partial<Scenario>) => void;
}

export function PppPanel({ scenario, onChange }: Props) {
  const { t, locale } = useI18n();
  const ppp = scenario.ppp;

  const setPpp = (patch: Partial<PppSelection>) => {
    onChange({ ppp: { ...ppp, ...patch } });
  };

  const tier = getPppTier(ppp.tierId);
  const quantity = normalizePppQuantity(ppp.quantity);
  const unitPrice = tier.commitUnits * (1 - tier.discountPct / 100);
  const committedUnits = tier.commitUnits * quantity;
  const upfront = unitPrice * quantity;

  // Reference annual usage (before PPP) to help size the quantity.
  const baseline = estimate({ ...scenario, ppp: { ...ppp, enabled: false } });
  const annualUsage = Math.round(baseline.paygAnnual);
  const fitQuantity = Math.max(
    1,
    Math.ceil(annualUsage / tier.commitUnits) || 1,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ppp.title")}</CardTitle>
        <CardDescription>{t("ppp.note")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={ppp.enabled}
            onChange={(e) => setPpp({ enabled: e.target.checked })}
          />
          {t("ppp.enable")}
        </label>

        {ppp.enabled && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between min-h-8">
                  <Label htmlFor="ppp-tier">{t("ppp.tier")}</Label>
                </div>
                <Select
                  value={tier.id}
                  onValueChange={(v) => setPpp({ tierId: v })}
                >
                  <SelectTrigger id="ppp-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pricing.pppTiers.map((tr) => (
                      <SelectItem key={tr.id} value={tr.id}>
                        {t(`ppp.tierLabel.${tr.id}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 min-h-8">
                  <Label htmlFor="ppp-qty">{t("ppp.quantity")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPpp({ quantity: fitQuantity })}
                  >
                    {t("ppp.fitQuantity")}: ×{fitQuantity}
                  </Button>
                </div>
                <Input
                  id="ppp-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) =>
                    setPpp({
                      quantity: normalizePppQuantity(Number(e.target.value)),
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded-md bg-muted px-3 py-2 text-sm flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("ppp.committedUnits")}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatNumber(committedUnits, locale)} CU
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    ({formatNumber(tier.commitUnits, locale)} × {quantity})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("ppp.purchasePrice")}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(upfront, "USD", locale)}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    ({tier.discountPct}% off)
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
