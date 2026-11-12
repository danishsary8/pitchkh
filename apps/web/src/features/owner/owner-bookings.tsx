"use client";

import type { BookingDetail, Paginated } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ClipboardList, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, SportBadge } from "@/components/common/page";
import { Price } from "@/components/common/price";
import { EmptyState, ErrorState, useErrorMessage } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BOOKING_STATUS_VARIANT } from "@/features/booking/booking-detail";
import { useVenueText } from "@/features/venues/text";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";

type Tab = "requests" | "upcoming" | "past";
const QUERIES = { requests: { status: "pending", scope: "upcoming", pageSize: 50 }, upcoming: { status: "confirmed", scope: "upcoming", pageSize: 50 }, past: { scope: "past", pageSize: 30 } } as const;

export function OwnerBookings() {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [tab, setTab] = useState<Tab>("requests");
  const query = QUERIES[tab];
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.owner.bookings(query), queryFn: () => api.owner.bookings(query) });

  // Optimistic: the request leaves the list immediately, and returns if the call fails.
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "accept" | "reject" }) => api.owner.decideBooking(v.id, v.decision),
    onMutate: async (v) => {
      const key = qk.owner.bookings(QUERIES.requests);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Paginated<BookingDetail>>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, data: previous.data.filter((b) => b.id !== v.id) });
      return { previous, key };
    },
    onError: (e, _v, ctx) => { if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous); toast.error(errorMessage(e)); },
    onSuccess: (_b, v) => toast.success(t(v.decision === "accept" ? "owner.accepted" : "owner.rejected")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["owner"] }),
  });

  return (
    <>
      <PageHeader title={t("owner.nav.bookings")} subtitle={t("owner.bookingsBody")} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="pb-4">
        <TabsList className="sm:w-fit">
          {(["requests", "upcoming", "past"] as const).map((v) => <TabsTrigger key={v} value={v}>{t(`owner.tabs.${v}`)}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {isPending ? <div className="flex flex-col gap-3" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.data.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title={t(`owner.empty.${tab}.title`)} body={t(`owner.empty.${tab}.body`)} />
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {data.data.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={BOOKING_STATUS_VARIANT[b.status]}>{t(`status.booking.${b.status}`)}</Badge>
                <SportBadge sport={b.sport} />
                <span className="font-num ml-auto text-sm font-semibold text-muted-foreground">{b.code}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg leading-snug font-bold">{b.customer.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{text.name(b.venue)} · {b.field.name}</p>
                </div>
                <Price usd={b.price.totalUsd} stacked className="shrink-0 items-end text-lg" />
              </div>
              <p className="flex items-center gap-2 text-[0.95rem] font-semibold">
                <CalendarDays className="size-4.5 text-primary" aria-hidden />
                {dates.day(b.date)} · <span className="font-num">{dates.range(b.startAt, b.endAt)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t("common.players", { count: b.teamSize })} · {t(`payment.${b.paymentMethod}`)} · {t(`status.paymentStatus.${b.paymentStatus}`)}
                {b.referee ? ` · ${t("booking.referee")}` : ""}{b.extras.waterBottles ? ` · ${t("booking.water")} ×${b.extras.waterBottles}` : ""}{b.extras.ball ? ` · ${t("booking.ball")}` : ""}{b.extras.bibs ? ` · ${t("booking.bibs")}` : ""}
              </p>
              {b.notes ? <p className="rounded-xl bg-secondary p-3 text-sm">“{b.notes}”</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="flex-1 sm:flex-none"><a href={`tel:${b.customer.phone.replace(/\s/g, "")}`}><Phone />{t("venue.call")}</a></Button>
                {b.status === "pending" ? (
                  <>
                    <Button variant="outline" className="flex-1 sm:flex-none" disabled={decide.isPending} onClick={() => decide.mutate({ id: b.id, decision: "reject" })}><X />{t("owner.reject")}</Button>
                    <Button className="flex-1 sm:flex-none" disabled={decide.isPending} onClick={() => decide.mutate({ id: b.id, decision: "accept" })}><Check />{t("owner.accept")}</Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
