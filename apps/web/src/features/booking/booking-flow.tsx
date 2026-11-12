"use client";

import { APP, calculatePrice, defaultTeamSize, isApiError, minutesOf, SKILL_LEVELS, supportsMatching, timeOf, type Field, type SkillLevel, type Sport, type VenueDetail } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, Minus, Plus, Swords, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SportIcon } from "@/components/brand/pitch-art";
import { Link, useNavigate } from "@/components/common/link";
import { Container, StickyBar } from "@/components/common/page";
import { Price } from "@/components/common/price";
import { ErrorState, useErrorMessage } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field as FormField, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { Alert, Spinner, Switch } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useVenueText } from "@/features/venues/text";
import { WeatherHint } from "@/features/venues/weather-hint";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useBookingDraft, type BookingDraft } from "./draft-store";
import { PaymentMethodPicker, PaymentSheet } from "./payment";
import { PriceLines } from "./price-lines";
import { DateStrip, SlotGrid } from "./slot-picker";

const STEPS = ["field", "time", "details", "pay"] as const;

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

function Counter({ value, onChange, min, max, label }: { value: number; onChange: (value: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <Button variant="secondary" size="icon" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} −`}>
        <Minus />
      </Button>
      <output className="font-num w-10 text-center text-lg font-bold" aria-live="polite">{value}</output>
      <Button variant="secondary" size="icon" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} +`}>
        <Plus />
      </Button>
    </div>
  );
}

function Row({ title, hint, children, htmlFor }: { title: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="font-bold">{title}</label>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function StepField({ venue, draft, update }: { venue: VenueDetail; draft: BookingDraft; update: (patch: Partial<BookingDraft>) => void }) {
  const t = useTranslations();
  const selected = venue.fields.find((f) => f.id === draft.fieldId);
  const [sport, setSport] = useState<Sport>(selected?.sport ?? venue.sports[0] ?? "football");
  const fields = venue.fields.filter((f) => f.sport === sport);
  return (
    <div className="flex flex-col gap-5">
      {venue.sports.length > 1 ? (
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("venues.filterSport")}>
          {venue.sports.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sport === s} onClick={() => setSport(s)} className="press flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-card text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground">
              <SportIcon sport={s} className="size-5.5" />
              {t(`sport.${s}`)}
            </button>
          ))}
        </div>
      ) : null}
      <div role="radiogroup" aria-label={t("venue.fields")} className="flex flex-col gap-2.5">
        {fields.map((field) => {
          const checked = field.id === draft.fieldId;
          const closed = field.status !== "active";
          return (
            <button key={field.id} type="button" role="radio" aria-checked={checked} disabled={closed} onClick={() => update({ fieldId: field.id, startTime: null, endTime: null, teamSize: null })} className={cn("press flex items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", checked ? "border-primary" : "border-transparent")}>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold">{field.name}</span>
                  <Badge variant="outline" className="font-num">{field.format}</Badge>
                  {closed ? <Badge variant="warning">{t("status.field.maintenance")}</Badge> : null}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {field.position} · {t(`surface.${field.surface}`)} · {field.indoor ? t("common.indoor") : t("common.outdoor")}
                </span>
                <span className="mt-1 block text-sm">
                  <Price usd={field.pricePerHourUsd} /> <span className="text-muted-foreground">/{t("venues.hr")} · {t("venue.peak")}</span> <span className="font-num font-semibold">${field.peakPricePerHourUsd}</span>
                </span>
              </span>
              <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2", checked ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                {checked ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTime({ venue, field, draft, update }: { venue: VenueDetail; field: Field; draft: BookingDraft; update: (patch: Partial<BookingDraft>) => void }) {
  const t = useTranslations("booking");
  const dates = useDates();
  const date = draft.date ?? dates.today;
  const range = draft.startTime && draft.endTime ? { startTime: draft.startTime, endTime: draft.endTime } : null;
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2.5" aria-labelledby="day-label">
        <h2 id="day-label" className="font-bold">{t("pickDay")}</h2>
        <DateStrip value={date} onChange={(d) => update({ date: d, startTime: null, endTime: null })} labelId="day-label" />
      </section>
      {!field.indoor ? <WeatherHint province={venue.province} date={date} /> : null}
      <section className="flex flex-col gap-2.5" aria-labelledby="time-label">
        <div>
          <h2 id="time-label" className="font-bold">{t("pickTime")}</h2>
          <p className="text-sm text-muted-foreground">{t("pickTimeHint", { min: APP.minBookingMinutes / 60, max: APP.maxBookingMinutes / 60 })}</p>
        </div>
        <SlotGrid fieldId={field.id} date={date} value={range} onChange={(next) => update({ startTime: next?.startTime ?? null, endTime: next?.endTime ?? null })} />
      </section>
    </div>
  );
}

function StepDetails({ field, draft, update }: { field: Field; draft: BookingDraft; update: (patch: Partial<BookingDraft>) => void }) {
  const t = useTranslations("booking");
  const tl = useTranslations("level");
  const teamSize = draft.teamSize ?? defaultTeamSize(field.format, field.sport);
  const matching = supportsMatching(field.sport);
  return (
    <div className="flex flex-col gap-3">
      {matching ? (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 font-bold">{t("opponentQuestion")}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
            {(["have", "find"] as const).map((mode) => {
              const checked = draft.opponentMode === mode;
              const Icon = mode === "have" ? Users : Swords;
              return (
                <button key={mode} type="button" role="radio" aria-checked={checked} onClick={() => update({ opponentMode: mode })} className={cn("press flex items-start gap-3 rounded-2xl border-2 bg-card p-4 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring", checked ? "border-primary" : "border-transparent")}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", checked ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{t(`opponent.${mode}.title`)}</span>
                    <span className="block text-sm text-muted-foreground">{t(`opponent.${mode}.body`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {draft.opponentMode === "find" ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
                <FormField className="rounded-2xl bg-card p-4">
                  <FieldLabel htmlFor="match-level">{t("teamLevel")}</FieldLabel>
                  <Select id="match-level" value={draft.matchLevel} onChange={(e) => update({ matchLevel: e.target.value as SkillLevel })}>
                    {SKILL_LEVELS.map((level) => <option key={level} value={level}>{tl(level)}</option>)}
                  </Select>
                  <FieldDescription>{t("teamLevelHint")}</FieldDescription>
                </FormField>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </fieldset>
      ) : null}

      <Row title={t("teamSize")} hint={t("teamSizeHint", { max: field.maxPlayers })}>
        <Counter value={teamSize} min={1} max={field.maxPlayers} onChange={(v) => update({ teamSize: v })} label={t("teamSize")} />
      </Row>
      {field.sport !== "tennis" ? (
        <Row title={t("referee")} hint={t("refereeHint", { price: `$${APP.refereeUsdPerHour}` })} htmlFor="referee">
          <Switch id="referee" checked={draft.referee} onCheckedChange={(referee) => update({ referee })} />
        </Row>
      ) : null}
      <Row title={t("water")} hint={t("waterHint", { price: `$${APP.waterBottleUsd.toFixed(2)}` })}>
        <Counter value={draft.extras.waterBottles} min={0} max={48} onChange={(waterBottles) => update({ extras: { ...draft.extras, waterBottles } })} label={t("water")} />
      </Row>
      <Row title={t("ball")} hint={t("ballHint", { price: `$${APP.ballRentalUsd}` })} htmlFor="ball">
        <Switch id="ball" checked={draft.extras.ball} onCheckedChange={(ball) => update({ extras: { ...draft.extras, ball } })} />
      </Row>
      {field.sport === "football" ? (
        <Row title={t("bibs")} hint={t("bibsHint", { price: `$${APP.bibsRentalUsd}` })} htmlFor="bibs">
          <Switch id="bibs" checked={draft.extras.bibs} onCheckedChange={(bibs) => update({ extras: { ...draft.extras, bibs } })} />
        </Row>
      ) : null}
      <FormField className="pt-2">
        <FieldLabel htmlFor="notes">{t("notes")}</FieldLabel>
        <Textarea id="notes" value={draft.notes} maxLength={500} onChange={(e) => update({ notes: e.target.value })} placeholder={t("notesPlaceholder")} />
      </FormField>
    </div>
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
  const [payOpen, setPayOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { data: venue, isPending, isError, error, refetch } = useQuery({ queryKey: qk.venue(slug), queryFn: () => api.venues.get(slug) });

  // Start or resume the draft from the link (?field, ?sport, ?date, ?from).
  useEffect(() => {
    if (!venue || hydrated) return;
    const linkField = venue.fields.find((f) => f.id === params.get("field") && f.status === "active");
    const sport = params.get("sport");
    const onlyField = venue.fields.filter((f) => f.status === "active" && (!sport || f.sport === sport));
    const date = params.get("date");
    const from = params.get("from");
    open(slug, {
      fieldId: linkField?.id ?? (onlyField.length === 1 ? onlyField[0]?.id : undefined),
      date: date && date >= dates.today ? date : undefined,
      ...(from && /^\d{2}:\d{2}$/.test(from) && linkField ? { startTime: from, endTime: timeOf(minutesOf(from) + APP.minBookingMinutes) } : {}),
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with the persisted draft store
    setHydrated(true);
  }, [venue, hydrated, params, open, slug, dates.today]);

  const field = venue?.fields.find((f) => f.id === draft?.fieldId);
  const date = draft?.date ?? dates.today;
  const price = field && draft?.startTime && draft.endTime ? calculatePrice({ field, date, startTime: draft.startTime, endTime: draft.endTime, referee: draft.referee && field.sport !== "tennis", extras: draft.extras }) : null;

  const create = useMutation({
    mutationFn: () => {
      if (!draft || !field || !draft.startTime || !draft.endTime) throw new Error("incomplete");
      return api.bookings.create({
        fieldId: field.id, date, startTime: draft.startTime, endTime: draft.endTime, teamSize: draft.teamSize ?? defaultTeamSize(field.format, field.sport),
        referee: draft.referee && field.sport !== "tennis", extras: { ...draft.extras, bibs: draft.extras.bibs && field.sport === "football" }, notes: draft.notes,
        opponentMode: supportsMatching(field.sport) ? draft.opponentMode : "have", matchLevel: draft.matchLevel, paymentMethod: draft.paymentMethod,
      });
    },
    onSuccess: async (booking) => {
      setPayOpen(false);
      await queryClient.invalidateQueries();
      queryClient.setQueryData(qk.booking(booking.id), booking);
      navigate(`/booking/${booking.id}?new=1`, { replace: true });
      clear();
    },
    onError: (e) => {
      setPayOpen(false);
      toast.error(errorMessage(e));
      // Someone took the slot while we were paying: back to the grid with fresh data.
      if (isApiError(e) && e.code === "slot_unavailable") {
        void queryClient.invalidateQueries({ queryKey: ["availability"] });
        update({ step: 1, startTime: null, endTime: null });
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

  const step = Math.min(draft.step, field ? (draft.startTime && draft.endTime ? 3 : 1) : 0);
  const canContinue = step === 0 ? !!field : step === 1 ? !!price : true;
  const goTo = (next: number): void => {
    update({ step: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pay = (): void => {
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/book/${slug}`)}`);
    if (draft.paymentMethod === "cash") create.mutate();
    else setPayOpen(true);
  };
  const primary =
    step < 3 ? (
      <Button size="lg" disabled={!canContinue} onClick={() => goTo(step + 1)} className="flex-1 lg:flex-none lg:px-10">
        {t("common.continue")}
      </Button>
    ) : (
      <Button size="lg" variant="accent" disabled={!price || create.isPending || status === "loading"} onClick={pay} className="flex-1 lg:flex-none lg:px-10">
        {create.isPending ? <Spinner /> : null}
        {!user ? t("booking.signInToPay") : draft.paymentMethod === "cash" ? t("booking.requestBooking") : t("booking.payAmount", { amount: `$${price?.totalUsd.toFixed(2) ?? ""}` })}
      </Button>
    );

  const summary = (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div>
        <p className="text-lg leading-snug font-bold">{text.name(venue)}</p>
        <p className="text-sm text-muted-foreground">{venue.district}, {t(`province.${venue.province}`)}</p>
      </div>
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
              <h1 className="font-display truncate text-xl sm:text-2xl">{t(`booking.title.${STEPS[step] ?? "field"}`)}</h1>
              <p className="truncate text-sm text-muted-foreground">{text.name(venue)}</p>
            </div>
          </div>
          <Stepper step={step} onStep={goTo} />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, transform: "translateX(16px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} exit={{ opacity: 0, transform: "translateX(-16px)" }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
              {step === 0 ? <StepField venue={venue} draft={draft} update={update} /> : null}
              {step === 1 && field ? <StepTime venue={venue} field={field} draft={draft} update={update} /> : null}
              {step === 2 && field ? <StepDetails field={field} draft={draft} update={update} /> : null}
              {step === 3 && field && price ? (
                <div className="flex flex-col gap-5">
                  <div className="lg:hidden">{summary}</div>
                  <section className="flex flex-col gap-3" aria-labelledby="pay-label">
                    <h2 id="pay-label" className="font-bold">{t("booking.paymentMethod")}</h2>
                    <PaymentMethodPicker value={draft.paymentMethod} onChange={(paymentMethod) => update({ paymentMethod })} />
                  </section>
                  {draft.paymentMethod === "cash" ? <Alert variant="warning" title={t("booking.cashTitle")}>{t("booking.cashBody")}</Alert> : null}
                  {draft.opponentMode === "find" && supportsMatching(field.sport) ? <Alert variant="info" icon={<Swords />} title={t("booking.findTitle")}>{t("booking.findBody")}</Alert> : null}
                  <p className="text-sm text-muted-foreground">{t("venue.freeCancel")}. {t("booking.demoNote")}</p>
                </div>
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
              <Price usd={price.totalUsd} className="text-lg" />
            </>
          ) : (
            <span className="text-muted-foreground">{t(step === 0 ? "booking.hintField" : "booking.hintTime")}</span>
          )}
        </div>
        {primary}
      </StickyBar>

      {price ? <PaymentSheet open={payOpen} onOpenChange={setPayOpen} method={draft.paymentMethod} totalUsd={price.totalUsd} reference={`${slug}-${date}-${draft.startTime ?? ""}`} onPaid={() => create.mutate()} pending={create.isPending} /> : null}
    </div>
  );
}
