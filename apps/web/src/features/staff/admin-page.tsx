"use client";

import { addDays, dateInPP } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Price } from "@/components/common/price";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Booking, type BookingStatus, hhmm } from "@/lib/booking-rules";
import { BRANCHES, branchName, findBranch } from "@/lib/branches";
import { client, HttpError } from "@/lib/client";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { getMiniApp } from "@/lib/telegram-webapp";
import { cn } from "@/lib/utils";
import { AddBookingSheet } from "./add-booking";
import { ContactButtons } from "./contact-buttons";
import { BookingSheet } from "./booking-sheet";
import { DayGrid } from "./day-grid";

/** Staff screen. Only opens for the Telegram accounts listed in ADMIN_TELEGRAM_IDS. */
export function AdminPage() {
  const t = useTranslations("staff");
  const me = useQuery({ queryKey: qk.adminMe, queryFn: client.admin.me, retry: false, staleTime: Infinity });

  if (me.isPending) return <Skeleton className="mx-4 mt-6 h-40 rounded-2xl" />;
  if (me.isError) {
    const code = me.error instanceof HttpError ? me.error.code : "unavailable";
    if (code === "unavailable" || code === "network") return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
    const id = getMiniApp()?.initDataUnsafe.user?.id;
    return (
      <EmptyState icon={<Lock />} title={t("locked.title")} body={t(`locked.${code === "not_admin" ? "notAdmin" : code === "not_configured" ? "notConfigured" : "notInTelegram"}`)}>
        {code === "not_admin" && id ? (
          <p className="font-num w-full rounded-xl bg-card px-4 py-3 text-sm select-all">
            {t("locked.yourId")} <b>{id}</b>
          </p>
        ) : null}
      </EmptyState>
    );
  }
  return <Board />;
}

function Board() {
  const t = useTranslations();
  const locale = useLocale();
  const dates = useDates();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const today = dateInPP(new Date());
  const days = useMemo(() => Array.from({ length: 15 }, (_, i) => addDays(today, i - 1)), [today]);

  const [branchSlug, setBranchSlug] = useState(() => findBranch(params.get("branch") ?? "")?.slug ?? BRANCHES[0]?.slug ?? "");
  const [date, setDate] = useState(() => (days.includes(params.get("date") ?? "") ? (params.get("date") as string) : today));
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ fieldId: string; startMin: number } | null>(null);
  const branch = findBranch(branchSlug) ?? BRANCHES[0];

  const data = useQuery({ queryKey: qk.admin(branchSlug, date), queryFn: () => client.admin.day(branchSlug, date), refetchInterval: 20_000 });

  const status = useMutation({
    mutationFn: ({ id, next }: { id: string; next: BookingStatus }) => client.admin.setStatus(id, next),
    onSuccess: (booking) => {
      toast.success(t(`staff.toast.${booking.status}`, { code: booking.code }));
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => toast.error(error instanceof HttpError && error.code === "slot_taken" ? t("staff.toast.clash") : t("book.errors.unavailable")),
  });

  if (!branch) return null;
  const all = [...(data.data?.day ?? []), ...(data.data?.pending ?? [])];
  const opened = all.find((b) => b.id === openId) ?? null;
  const setBookingStatus = (id: string, next: BookingStatus) => status.mutate({ id, next });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-4 lg:px-6 lg:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-3xl tracking-tight">{t("staff.title")}</h1>
        <Button size="sm" onClick={() => setAdding({ fieldId: branch.fields[0]?.id ?? "", startMin: -1 })}>
          <Plus />
          {t("staff.add")}
        </Button>
      </div>

      <PendingList bookings={data.data?.pending ?? []} loading={data.isPending} onOpen={setOpenId} onStatus={setBookingStatus} busy={status.isPending} />

      <section className="flex flex-col gap-3" aria-labelledby="day-title">
        <h2 id="day-title" className="text-lg font-bold">{t("staff.schedule")}</h2>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-card p-1 [scrollbar-width:none]" role="group" aria-label={t("staff.branch")}>
          {BRANCHES.map((b) => (
            <button key={b.slug} type="button" aria-pressed={b.slug === branchSlug} onClick={() => setBranchSlug(b.slug)} className={cn("shrink-0 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring", b.slug === branchSlug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {branchName(b, locale)}
            </button>
          ))}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          {days.map((d) => (
            <button key={d} type="button" aria-pressed={d === date} onClick={() => setDate(d)} className={cn("font-num shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring", d === date ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground")}>
              {dates.day(d)}
            </button>
          ))}
        </div>
        {data.isPending ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : data.isError ? (
          <ErrorState error={data.error} onRetry={() => void data.refetch()} />
        ) : (
          <DayGrid branch={branch} date={date} bookings={data.data.day} onOpen={setOpenId} onEmpty={(fieldId, startMin) => setAdding({ fieldId, startMin })} />
        )}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-warning" />{t("book.status.pending")}</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" />{t("book.status.confirmed")}</li>
          <li className="flex items-center gap-1.5"><span className="size-3 rounded border border-dashed border-foreground/40" />{t("staff.freeTap")}</li>
        </ul>
      </section>

      <BookingSheet booking={opened} onClose={() => setOpenId(null)} onStatus={setBookingStatus} busy={status.isPending} />
      {adding ? (
        <AddBookingSheet
          branch={branch}
          date={date}
          initial={adding}
          onClose={() => setAdding(null)}
          onDone={(b) => {
            setAdding(null);
            toast.success(t("staff.toast.confirmed", { code: b.code }));
            void queryClient.invalidateQueries({ queryKey: ["admin"] });
          }}
        />
      ) : null}
    </div>
  );
}

function PendingList({ bookings, loading, onOpen, onStatus, busy }: { bookings: Booking[]; loading: boolean; onOpen: (id: string) => void; onStatus: (id: string, s: BookingStatus) => void; busy: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const dates = useDates();
  return (
    <section aria-labelledby="pending-title" className="flex flex-col gap-3">
      <h2 id="pending-title" className="flex items-center gap-2 text-lg font-bold">
        {t("staff.pending")}
        {bookings.length ? <Badge variant="warning" className="font-num">{bookings.length}</Badge> : null}
      </h2>
      {loading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : bookings.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">{t("staff.noPending")}</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {bookings.map((b) => {
            const branch = findBranch(b.branch);
            const field = branch?.fields.find((f) => f.id === b.fieldId);
            return (
              <li key={b.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4">
                <button type="button" onClick={() => onOpen(b.id)} className="flex flex-col gap-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring">
                  <span className="font-bold">{b.name} <span className="font-num text-sm font-medium text-muted-foreground">· {b.code}</span></span>
                  <span className="text-sm">{branch ? branchName(branch, locale) : b.branch} · {field?.name ?? b.fieldId}</span>
                  <span className="font-num text-sm text-muted-foreground">{dates.day(b.date)} · {hhmm(b.startMin)}–{hhmm(b.endMin)} · <Price usd={b.priceUsd} khrClassName="hidden" /></span>
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={() => onStatus(b.id, "confirmed")}><Check />{t("staff.confirm")}</Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => onStatus(b.id, "cancelled")}><X />{t("staff.decline")}</Button>
                  <ContactButtons booking={b} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
