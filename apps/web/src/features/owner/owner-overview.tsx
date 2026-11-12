"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, Gauge, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/common/link";
import { PageHeader } from "@/components/common/page";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { BarChart, Kpi, Panel, ResponsiveTable, ShareBars } from "@/features/dashboard/shared";
import { api } from "@/lib/api";
import { useDates, useMoney } from "@/lib/format";
import { qk } from "@/lib/query";

const SPORT_COLOR = { football: "var(--sport-football)", volleyball: "var(--sport-volleyball)", tennis: "var(--sport-tennis)" } as const;

export function OwnerOverview() {
  const t = useTranslations();
  const { user } = useAuth();
  const money = useMoney();
  const dates = useDates();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.owner.earnings, queryFn: api.owner.earnings });
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const change = data && data.lastMonthUsd > 0 ? Math.round(((data.thisMonthUsd - data.lastMonthUsd) / data.lastMonthUsd) * 100) : null;
  return (
    <>
      <PageHeader title={t("owner.greeting", { name: user?.name.split(" ").pop() ?? "" })} subtitle={t("owner.overviewBody")} />
      {isPending ? (
        <div className="flex flex-col gap-4" aria-busy>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi tone="primary" icon={Wallet} label={t("owner.kpi.month")} value={money.usd(data.thisMonthUsd)} hint={change === null ? money.khr(data.thisMonthUsd) : t("owner.kpi.vsLast", { change: `${change >= 0 ? "+" : ""}${change}%` })} />
            <Kpi icon={CalendarCheck} label={t("owner.kpi.bookings")} value={data.bookingsCount} hint={t("owner.kpi.allTime", { amount: money.usd(data.totalUsd) })} />
            <Kpi icon={Gauge} label={t("owner.kpi.occupancy")} value={`${Math.round(data.occupancyRate * 100)}%`} hint={t("owner.kpi.occupancyHint")} />
            <Kpi tone={data.pendingRequests ? "accent" : "default"} icon={Clock} label={t("owner.kpi.pending")} value={data.pendingRequests} hint={t("owner.kpi.pendingHint")} />
          </div>
          {data.pendingRequests > 0 ? (
            <Button asChild variant="accent" size="lg" className="sm:w-fit"><Link href="/owner/bookings">{t("owner.reviewRequests", { count: data.pendingRequests })}</Link></Button>
          ) : null}
          <Panel title={t("owner.revenue14")} action={<span className="font-num text-sm text-muted-foreground">{t("owner.payout", { amount: money.usd(data.pendingPayoutUsd) })}</span>}>
            <BarChart label={t("owner.revenue14")} format={money.usd} data={data.byDay.map((d) => ({ label: dates.dayOfMonth(d.date), hint: dates.day(d.date, false), value: d.revenueUsd }))} />
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t("owner.bySport")}><ShareBars format={money.usd} rows={data.bySport.map((s) => ({ label: `${t(`sport.${s.sport}`)} · ${s.bookings}`, value: s.revenueUsd, color: SPORT_COLOR[s.sport] }))} /></Panel>
            <Panel title={t("owner.byPayment")}><ShareBars format={money.usd} rows={data.byPaymentMethod.map((p) => ({ label: t(`payment.${p.method as "khqr"}`), value: p.revenueUsd }))} /></Panel>
          </div>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{t("owner.byField")}</h2>
            <ResponsiveTable
              caption={t("owner.byField")}
              rows={data.byField.slice(0, 8)}
              rowKey={(r) => r.fieldId}
              columns={[
                { header: t("booking.field"), primary: true, cell: (r) => r.fieldName },
                { header: t("matches.venue"), cell: (r) => r.venueName },
                { header: t("owner.kpi.bookings"), align: "right", cell: (r) => <span className="font-num">{r.bookings}</span> },
                { header: t("owner.revenue"), align: "right", cell: (r) => <span className="font-num">{money.usd(r.revenueUsd)}</span> },
              ]}
            />
          </section>
        </div>
      )}
    </>
  );
}
