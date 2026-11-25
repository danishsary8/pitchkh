"use client";

import { APP, calculatePrice, defaultTeamSize, formatUsd, isApiError, minutesOf, supportsMatching, timeOf, type PaymentIntent, type Sport } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/components/common/link";
import { Container, StickyBar } from "@/components/common/page";
import { Price } from "@/components/common/price";
import { ErrorState, useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { TelegramBookingCard } from "@/features/telegram/telegram";
import { useVenueText } from "@/features/venues/text";
import { PitchMap } from "@/features/pitch-map/pitch-map";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useBookingDraft } from "./draft-store";
import { PaymentSheet } from "./payment";
import { PriceLines } from "./price-lines";
import { StepConfirm } from "./step-confirm";
import { StepPick } from "./step-pick";

const STEPS = ["pick", "confirm"] as const;

function Stepper({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const t = useTranslations("booking");
  return (
    <ol className="flex items-center gap-1.5" aria-label={t("progress", { step: step + 1, total: STEPS.length })}>
      {STEPS.map((name, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={name} className="flex flex-1 flex-col gap-1.5" aria-current={current ? "step" : undefined}>
            <button type="button" disabled={!done} onClick={() => onStep(i)} className="group flex flex-col gap-1.5 text-left outline-none disabled:cursor-default" aria-label={t(`steps.${name}`)}>
              <span className="relative h-1.5 overflow-hidden rounded-full bg-secondary group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <span className={cn("absolute inset-0 origin-left rounded-full bg-primary transition-transform duration-300 ease-out", done || current ? "scale-x-100" : "scale-x-0")} />
              </span>
              <span className={cn("truncate text-xs font-semibold", current ? "text-foreground" : done ? "text-primary" : "text-muted-foreground")}>{t(`steps.${name}`)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function BookingFlow({ slug }: { slug: string }) {
  const t = useTranslations();
  const text = useVenueText();
  const dates = useDates();
  const params = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { user, status } = useAuth();
  const { draft, open, update, clear } = useBookingDraft();
  // An online booking waiting for its payment: the sheet shows the QR / app link.
  const [checkout, setCheckout] = useState<{ bookingId: string; intent: PaymentIntent } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { data: venue, isPending, isError, error, refetch } = useQuery({ queryKey: qk.venue(slug), queryFn: () => api.venues.get(slug) });

  // Start or resume the draft from the link (?field, ?sport, ?date, ?from).
  useEffect(() => {
    if (!venue || hydrated) return;
    const linkField = venue.fields.find((f) => f.id === params.get("field") && f.status === "active");
    const sportParam = params.get("sport");
    const sport = venue.sports.find((s) => s === sportParam);
    const onlyField = venue.fields.filter((f) => f.status === "active" && (!sport || f.sport === sport));
    const date = params.get("date");
    const from = params.get("from");
    // ?time= comes from a venue card's "19:00" chip: colour the map for that start.
    const time = params.get("time");
    open(slug, {
      sport: (linkField?.sport ?? sport ?? undefined) as Sport | undefined,
      fieldId: linkField?.id ?? (onlyField.length === 1 ? onlyField[0]?.id : undefined),
      date: date && date >= dates.today ? date : undefined,
      ...(from && /^\d{2}:\d{2}$/.test(from) && linkField ? { startTime: from, endTime: timeOf(minutesOf(from) + APP.minBookingMinutes) } : {}),
      ...(time && /^\d{2}:\d{2}$/.test(time) ? { wantedStart: time, ...(onlyField.length === 1 ? { startTime: time, endTime: timeOf(minutesOf(time) + APP.minBookingMinutes) } : {}) } : {}),
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with the persisted draft store
    setHydrated(true);
  }, [venue, hydrated, params, open, slug, dates.today]);

  const field = venue?.fields.find((f) => f.id === draft?.fieldId);
  const date = draft?.date ?? dates.today;
  const price = field && draft?.startTime && draft.endTime ? calculatePrice({ field, date, startTime: draft.startTime, endTime: draft.endTime, referee: draft.referee && field.sport !== "tennis", extras: draft.extras }) : null;

  const finish = async (bookingId: string): Promise<void> => {
    await queryClient.invalidateQueries();
    navigate(`/booking/${bookingId}?new=1`, { replace: true });
    clear();
  };
  const onPaid = (paid: PaymentIntent): void => {
    void finish(paid.bookingId);
  };

  const create = useMutation({
    mutationFn: () => {
      if (!draft || !field || !draft.startTime || !draft.endTime) throw new Error("incomplete");
      // 1. Book (online methods hold the slot while we pay). 2. Start the payment.
      return api.bookings
        .create({
          fieldId: field.id, date, startTime: draft.startTime, endTime: draft.endTime, teamSize: draft.teamSize ?? defaultTeamSize(field.format, field.sport),
          referee: draft.referee && field.sport !== "tennis", extras: { ...draft.extras, bibs: draft.extras.bibs && field.sport === "football" }, notes: draft.notes,
          opponentMode: supportsMatching(field.sport) ? draft.opponentMode : "have", matchLevel: draft.matchLevel, paymentMethod: draft.paymentMethod,
        })
        .then(async (booking) => ({ booking, intent: booking.status === "awaiting_payment" ? await api.bookings.pay(booking.id) : null }));
    },
    onSuccess: async ({ booking, intent }) => {
      queryClient.setQueryData(qk.booking(booking.id), booking);
      if (intent) setCheckout({ bookingId: booking.id, intent });
      else await finish(booking.id);
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      // Someone took the slot while we were paying: back to the grid with fresh data.
      if (isApiError(e) && e.code === "slot_unavailable") {
        void queryClient.invalidateQueries({ queryKey: ["availability"] });
        update({ step: 0, startTime: null, endTime: null });
      }
    },
  });

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} className="my-auto" />;
  if (isPending || !draft || draft.slug !== slug) {
    return (
      <Container size="md" className="flex flex-col gap-4 py-6" >
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-full" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </Container>
    );
  }

  const step = Math.min(draft.step, field && price ? 1 : 0);
  const canContinue = !!field && !!price;
  const goTo = (next: number): void => {
    update({ step: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pay = (): void => {
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/book/${slug}`)}`);
    create.mutate();
  };
  const primary =
    step === 0 ? (
      <Button size="lg" disabled={!canContinue} onClick={() => goTo(step + 1)} className="flex-1 lg:flex-none lg:px-10">
        {t("common.continue")}
      </Button>
    ) : (
      <Button size="lg" variant="accent" disabled={!price || create.isPending || status === "loading"} onClick={pay} className="flex-1 lg:flex-none lg:px-10">
        {create.isPending ? <Spinner /> : null}
        {!user ? t("booking.signInToPay") : draft.paymentMethod === "cash" ? t("booking.requestBooking") : t("booking.payAmount", { amount: price ? formatUsd(price.totalUsd) : "" })}
      </Button>
    );

  const summary = (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div>
        <p className="text-lg leading-snug font-bold">{text.name(venue)}</p>
        <p className="text-sm text-muted-foreground">{venue.district}, {t(`province.${venue.province}`)}</p>
      </div>
      {field && venue.fields.length > 1 ? <PitchMap fields={venue.fields} selectedId={field.id} compact label={t("pitchMap.whereLabel", { name: field.name })} /> : null}
      <dl className="flex flex-col gap-2 text-[0.95rem]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("booking.field")}</dt>
          <dd className="text-right font-semibold">{field ? `${field.name} · ${field.format}` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("common.date")}</dt>
          <dd className="text-right font-semibold">{dates.day(date)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("common.time")}</dt>
          <dd className="font-num text-right font-semibold">{draft.startTime && draft.endTime ? `${draft.startTime} – ${draft.endTime}` : "—"}</dd>
        </div>
      </dl>
      {price ? <PriceLines price={price} className="border-t border-border pt-4" /> : <p className="border-t border-border pt-4 text-sm text-muted-foreground">{t("booking.pickToSeePrice")}</p>}
    </div>
  );

  return (
    <div className="pb-28 lg:pb-12">
      <Container className="grid grid-cols-1 gap-x-10 gap-y-6 pt-4 lg:grid-cols-[minmax(0,1fr)_23rem] lg:pt-8">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center gap-2">
            {step === 0 ? (
              <Button asChild variant="ghost" size="icon" className="-ml-2">
                <Link href={`/venues/${slug}`} aria-label={t("common.back")}><ChevronLeft /></Link>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="-ml-2" onClick={() => goTo(step - 1)} aria-label={t("common.back")}>
                <ChevronLeft />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="font-display truncate text-xl sm:text-2xl">{t(`booking.title.${STEPS[step] ?? "pick"}`)}</h1>
              <p className="truncate text-sm text-muted-foreground">{text.name(venue)}</p>
            </div>
          </div>
          <Stepper step={step} onStep={goTo} />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, transform: "translateX(16px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} exit={{ opacity: 0, transform: "translateX(-16px)" }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
              {step === 0 ? <StepPick venue={venue} draft={draft} update={update} /> : null}
              {step === 1 && field ? <StepConfirm venue={venue} field={field} draft={draft} update={update} summary={summary} /> : null}
              {step === 1 && field && price && draft.startTime && draft.endTime ? (
                <TelegramBookingCard venue={venue} field={field} date={date} startTime={draft.startTime} endTime={draft.endTime} teamSize={draft.teamSize ?? defaultTeamSize(field.format, field.sport)} notes={draft.notes} price={price} className="mt-6" />
              ) : null}
            </motion.div>
          </AnimatePresence>
          <div className="hidden justify-end pt-2 lg:flex">{primary}</div>
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start" aria-label={t("booking.summary")}>
          {summary}
        </aside>
      </Container>

      <StickyBar aboveTabs={false}>
        <div className="min-w-0 flex-1 text-sm leading-tight" aria-live="polite">
          {price ? (
            <>
              <span className="font-num text-muted-foreground">{draft.startTime} – {draft.endTime}</span>
              <br />
              <Price usd={price.totalUsd} className="text-lg" animated />
            </>
          ) : (
            <span className="text-muted-foreground">{t(field ? "booking.hintTime" : "booking.hintField")}</span>
          )}
        </div>
        {primary}
      </StickyBar>

      {checkout ? (
        <PaymentSheet
          intent={checkout.intent}
          open
          onPaid={onPaid}
          // Closed before paying: the booking page has a "Pay now" button while the hold lasts.
          onOpenChange={(open) => {
            if (!open) {
              navigate(`/booking/${checkout.bookingId}`, { replace: true });
              clear();
            }
          }}
        />
      ) : null}
    </div>
  );
}
