import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/i18n";
import { comparePlans, estimate, headlineMonthly, headlineAnnual } from "@/lib/calc";
import type { Scenario } from "@/lib/share";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  scenario: Scenario;
}

export function Charts({ scenario }: Props) {
  const { t, locale } = useI18n();
  const [metric, setMetric] = useState<"monthly" | "annual">("monthly");

  const both = comparePlans(scenario);
  const r = estimate(scenario);
  const cur = r.targetCurrency ?? r.currency;
  const rate = r.fxRate ?? 1;
  const money = (value: number) =>
    cur === "USD" || cur === "JPY"
      ? formatMoney(value, cur)
      : formatCurrency(value, cur, locale);

  const costData = [
    {
      name: t("form.business"),
      value:
        (metric === "monthly"
          ? headlineMonthly(both.business)
          : headlineAnnual(both.business)) * rate,
    },
    {
      name: t("form.enterprise"),
      value:
        (metric === "monthly"
          ? headlineMonthly(both.enterprise)
          : headlineAnnual(both.enterprise)) * rate,
    },
  ];

  const cheaper =
    headlineAnnual(both.business) <= headlineAnnual(both.enterprise)
      ? t("form.business")
      : t("form.enterprise");

  const poolData = [
    {
      name: t("chart.included"),
      value: r.totalIncludedCredits,
      fill: "var(--chart-2)",
    },
    {
      name: t("chart.consumed"),
      value: r.totalConsumedCredits,
      fill: r.overageCredits > 0 ? "var(--destructive)" : "var(--chart-1)",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("chart.costTitle")}</CardTitle>
          <Tabs
            value={metric}
            onValueChange={(v) => setMetric(v as "monthly" | "annual")}
            className="no-print"
          >
            <TabsList>
              <TabsTrigger value="monthly">{t("compare.monthly")}</TabsTrigger>
              <TabsTrigger value="annual">{t("compare.annual")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            {t("compare.cheaper")}:{" "}
            <span className="font-semibold text-foreground">{cheaper}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => money(v as number)}
                width={90}
              />
              <Tooltip
                formatter={(v) => money(v as number)}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {costData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={
                      d.name === cheaper ? "var(--chart-1)" : "var(--chart-3)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("chart.poolTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={poolData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => formatNumber(v as number, locale)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={90}
              />
              <Tooltip
                formatter={(v) =>
                  `${formatNumber(v as number, locale)} ${t("result.credits")}`
                }
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {poolData.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
