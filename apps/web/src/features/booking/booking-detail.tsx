"use client";

import { bookingToGoogleCalendarUrl, bookingToIcs, type BookingDetail as Booking, type BookingStatus } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CalendarSync, Check, Clock, Download, MapPin, Navigation, Star, Swords, X } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { KramaStrip } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";
import { Container, PageHeader, SportBadge } from "@/components/common/page";
import { ErrorState, useErrorMessage } from "@/components/common/states";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useVenueText } from "@/features/venues/text";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { PriceLines } from "./price-lines";
import { ReviewSheet } from "./review-sheet";
import { DateStrip, SlotGrid, type TimeRange } from "./slot-picker";

export const BOOKING_STATUS_VARIANT: Record<BookingStatus, BadgeVariant> = { pending: "warning", confirmed: "success", rejected: "destructive", cancelled: "muted", completed: "secondary" };

function RescheduleSheet({ booking, open, onOpenChange }: { booking: Booking; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [date, setDate] = useState(booking.date);
  const [range, setRange] = useState<TimeRange | null>(null);
  const mutation = useMutation({
    mutationFn: () => api.bookings.reschedule(booking.id, { date, startTime: range?.startTime ?? "", endTime: range?.endTime ?? "" }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(qk.booking(booking.id), updated);
      await queryClient.invalidateQueries();
      toast.success(t("rescheduled"));
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      void queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("rescheduleTitle")}
      description={t("rescheduleBody")}
      className="md:w-[min(40rem,calc(100vw-2rem))]"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button disabled={!range || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner /> : null}
            {range ? t("moveTo", { time: `${range.startTime} – ${range.endTime}` }) : t("pickTime")}
          </Button>
        </>
      }
    >
      <DateStrip value={date} onChange={(d) => { setDate(d); setRange(null); }} />
      <SlotGrid fieldId={booking.fieldId} date={date} value={range} onChange={setRange} />
    </Sheet>
  );
}

export function BookingDetail({ id }: { id: string }) {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const fresh = params.get("new") === "1";
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data: booking, isPending, isError, error, refetch } = useQuery({ queryKey: qk.booking(id), queryFn: () => api.bookings.get(id) });

  const cancel = useMutation({
    mutationFn: () => api.bookings.cancel(id),
    onSuccess: async (updated) => {
      queryClient.setQueryData(qk.booking(id), updated);
      await queryClient.invalidateQueries();
      setCancelOpen(false);
      toast(t("booking.cancelled"));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isPending) {
    return (
      <Container size="sm" className="flex flex-col gap-4 py-8" >
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="mx-auto h-8 w-2/3" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </Container>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} className="my-auto" />;

  const venueName = text.name(booking.venue);
  const title = `${t(`sport.${booking.sport}`)} · ${venueName}`;
  const downloadIcs = (): void => {
    const url = URL.createObjectURL(new Blob([bookingToIcs(booking, title)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pitchkh-${booking.code}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const active = booking.status === "pending" || booking.status === "confirmed";
  const rows: [string, React.ReactNode][] = [
    [t("booking.field"), `${booking.field.name} · ${booking.field.format}`],
    [t("common.date"), dates.dayLong(booking.date)],
    [t("common.time"), <span key="t" className="font-num">{dates.range(booking.startAt, booking.endAt)}</span>],
    [t("booking.teamSize"), t("common.players", { count: booking.teamSize })],
    [t("booking.paymentMethod"), `${t(`payment.${booking.paymentMethod}`)} · ${t(`status.paymentStatus.${booking.paymentStatus}`)}`],
  ];

  return (
    <Container size="sm" className="pb-8">
      {fresh ? (
        <div className="flex flex-col items-center gap-3 pt-8 pb-6 text-center">
          <motion.div initial={{ opacity: 0, transform: "scale(0.6)" }} animate={{ opacity: 1, transform: "scale(1)" }} transition={{ type: "spring", duration: 0.6, bounce: 0.35 }} className="grid size-18 place-items-center rounded-full bg-primary text-primary-foreground">
            {booking.status === "pending" ? <Clock className="size-9" /> : <Check className="size-10" strokeWidth={3} />}
          </motion.div>
          <h1 className="font-display text-3xl text-balance">{booking.status === "pending" ? t("booking.requestSent") : t("booking.confirmedTitle")}</h1>
          <p className="max-w-sm text-pretty text-muted-foreground">{booking.status === "pending" ? t("booking.requestSentBody") : t("booking.confirmedBody")}</p>
        </div>
      ) : (
        <PageHeader title={t("booking.detailTitle")} back="/account/bookings" />
      )}

      {/* The receipt: a match ticket with a krama edge. */}
      <motion.section aria-label={t("booking.receipt")} initial={fresh ? { opacity: 0, transform: "translateY(24px)" } : false} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.15 }} className="overflow-hidden rounded-3xl bg-card">
        <KramaStrip />
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                <SportBadge sport={booking.sport} />
                <Badge variant={BOOKING_STATUS_VARIANT[booking.status]}>{t(`status.booking.${booking.status}`)}</Badge>
              </div>
              <h2 className="text-xl leading-snug font-bold">
                <Link href={`/venues/${booking.venue.slug}`} className="underline-offset-4 hover:underline">{venueName}</Link>
              </h2>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {booking.venue.address}, {booking.venue.district}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">{t("booking.code")}</p>
              <p className="font-num text-lg font-bold">{booking.code}</p>
            </div>
          </div>

          <dl className="flex flex-col gap-2.5 border-y border-dashed border-foreground/25 py-4 text-[0.95rem]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
            {booking.notes ? (
              <div className="flex flex-col gap-0.5 pt-1">
                <dt className="text-muted-foreground">{t("booking.notes")}</dt>
                <dd>{booking.notes}</dd>
              </div>
            ) : null}
          </dl>
          <PriceLines price={booking.price} />
        </div>
      </motion.section>

      <div className="flex flex-col gap-3 pt-5">
        {booking.status === "pending" ? <Alert variant="warning" title={t("booking.cashTitle")}>{t("booking.pendingBody")}</Alert> : null}
        {booking.status === "rejected" ? <Alert variant="destructive" title={t("booking.rejectedTitle")}>{t("booking.rejectedBody")}</Alert> : null}
        {booking.matchRequestId && active ? (
          <Alert variant="info" icon={<Swords />} title={t("booking.findTitle")}>
            <Link href={`/matches/${booking.matchRequestId}`} className="font-semibold text-primary underline underline-offset-4">{t("booking.viewMatch")}</Link>
          </Alert>
        ) : null}

        {active ? (
          <div className="grid grid-cols-2 gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <CalendarPlus />
                  {t("booking.addToCalendar")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => window.open(bookingToGoogleCalendarUrl(booking, title), "_blank", "noopener")}>
                    <CalendarPlus />
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={downloadIcs}>
                    <Download />
                    {t("booking.downloadIcs")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" asChild>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${booking.venue.lat},${booking.venue.lng}`} target="_blank" rel="noopener noreferrer">
                <Navigation />
                {t("venue.directions")}
              </a>
            </Button>
            <Button variant="outline" disabled={!booking.canReschedule} onClick={() => setRescheduleOpen(true)}>
              <CalendarSync />
              {t("booking.reschedule")}
            </Button>
            <Button variant="outline" disabled={!booking.canCancel} onClick={() => setCancelOpen(true)} className="text-destructive">
              <X />
              {t("booking.cancelBooking")}
            </Button>
          </div>
        ) : null}
        {active && !booking.canCancel ? <p className="text-center text-sm text-muted-foreground">{t("errors.cancellation_window_passed")}</p> : null}

        {booking.status === "completed" && !booking.reviewed ? (
          <Button size="lg" onClick={() => setReviewOpen(true)}>
            <Star />
            {t("booking.rateVenue")}
          </Button>
        ) : null}
        {fresh ? (
          <Button asChild variant="ghost">
            <Link href="/account/bookings">{t("booking.viewAll")}</Link>
          </Button>
        ) : null}
      </div>

      <Sheet
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("booking.cancelTitle")}
        description={booking.paymentStatus === "paid" ? t("booking.cancelBodyPaid", { amount: `$${booking.price.totalUsd.toFixed(2)}`, method: t(`payment.${booking.paymentMethod}`) }) : t("booking.cancelBodyUnpaid")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>{t("booking.keep")}</Button>
            <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? <Spinner /> : null}
              {t("booking.cancelBooking")}
            </Button>
          </>
        }
      >
        <p className="rounded-2xl bg-secondary p-3.5 text-sm">
          <span className="font-bold">{venueName}</span> · {booking.field.name}
          <br />
          {dates.day(booking.date)} · <span className="font-num">{dates.range(booking.startAt, booking.endAt)}</span>
        </p>
      </Sheet>
      {rescheduleOpen ? <RescheduleSheet booking={booking} open onOpenChange={setRescheduleOpen} /> : null}
      <ReviewSheet open={reviewOpen} onOpenChange={setReviewOpen} targetType="venue" targetId={booking.venue.id} targetName={venueName} bookingId={booking.id} />
    </Container>
  );
}
