"use client";

import type { Field, Sport } from "@pitchkh/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Clock, Lightbulb, MapPin, Navigation } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/components/common/link";
import { Price } from "@/components/common/price";
import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PitchLegend, PitchMap, type PitchState } from "@/features/pitch-map/pitch-map";
import { bookableDates, DURATIONS, hhmm, isFieldFree, isPast, priceFor, startTimes, type TakenSlot } from "@/lib/booking-rules";
import { type Branch, branchName, branchSports, findBranch } from "@/lib/branches";
import { client, type CreatedBooking, HttpError } from "@/lib/client";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";
import { BookingForm } from "./booking-form";
import { BookingDone } from "./booking-done";
import { OwnerChatButton } from "./owner-chat";

function Chip({ active, disabled, onClick, children, className }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "press flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35",
        active ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-secondary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BranchBooking({ slug }: { slug: string }) {
  const branch = findBranch(slug) as Branch;
  const t = useTranslations();
  const locale = useLocale();
  const dates = useDates();
  const queryClient = useQueryClient();
  const days = useMemo(() => bookableDates(), []);

  const [date, setDate] = useState(days[0] ?? "");
  const [sport, setSport] = useState<Sport | null>(null);
  const [duration, setDuration] = useState<number>(DURATIONS[0]);
  const [start, setStart] = useState<number | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [done, setDone] = useState<CreatedBooking | null>(null);

  const taken = useQuery({ queryKey: qk.taken(branch.slug, date), queryFn: () => client.taken(branch.slug, date), refetchInterval: 30_000 });
  const slots: TakenSlot[] = taken.data ?? [];

  const fields = branch.fields.filter((f) => !sport || f.sport === sport);
  const times = startTimes(branch, duration).filter((m) => !isPast(date, m));
  const freeCount = (m: number): number => fields.filter((f) => isFieldFree(slots, f.id, m, m + duration)).length;

  const states: Record<string, PitchState> = {};
  for (const f of branch.fields) {
    const free = start !== null ? isFieldFree(slots, f.id, start, start + duration) : times.some((m) => isFieldFree(slots, f.id, m, m + duration));
    states[f.id] = free ? "free" : "full";
  }

  const field = branch.fields.find((f) => f.id === fieldId) ?? null;
  const ready = !!field && start !== null && states[field.id] === "free";

  const pickDate = (next: string) => {
    setDate(next);
    setStart(null);
  };

  const onBooked = (booking: CreatedBooking) => {
    setFormOpen(false);
    setDone(booking);
    void queryClient.invalidateQueries({ queryKey: qk.taken(branch.slug, date) });
    window.scrollTo({ top: 0 });
  };

  const onTaken = () => {
    toast.error(t("book.errors.slot_taken"));
    setFormOpen(false);
    setFieldId(null);
    void taken.refetch();
  };

  if (done) {
    return <BookingDone branch={branch} booking={done} onAgain={() => { setDone(null); setFieldId(null); setStart(null); }} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-4 lg:px-6 lg:pt-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="w-fit text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← {t("book.branch.allBranches")}
        </Link>
        <h1 className="font-display text-3xl leading-none tracking-tight sm:text-4xl">{branchName(branch, locale)}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {branch.address}, {branch.district}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            <span className="font-num">{branch.open}–{branch.close}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="secondary" size="sm">
            <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation />
              {t("book.branch.directions")}
            </a>
          </Button>
          <OwnerChatButton size="sm" message={t("book.chat.hello", { branch: branchName(branch, locale) })} />
        </div>
      </header>

      <section aria-labelledby="pick-day" className="flex flex-col gap-2">
        <h2 id="pick-day" className="font-bold">{t("book.branch.day")}</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
          {days.map((d) => (
            <Chip key={d} active={d === date} onClick={() => pickDate(d)} className="min-w-16">
              <span className="text-xs font-medium opacity-80">{d === days[0] ? t("common.today") : dates.weekday(d)}</span>
              <span className="font-num text-lg leading-tight">{dates.dayOfMonth(d)}</span>
              <span className="text-xs font-medium opacity-80">{dates.month(d)}</span>
            </Chip>
          ))}
        </div>
      </section>

      <section aria-labelledby="pick-time" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pick-time" className="font-bold">{t("book.branch.time")}</h2>
          <div className="flex gap-1 rounded-xl bg-card p-1" role="group" aria-label={t("book.branch.duration")}>
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={d === duration}
                onClick={() => { setDuration(d); setStart(null); }}
                className={cn("font-num rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring", d === duration ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h30`}
              </button>
            ))}
          </div>
        </div>
        {taken.isPending ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : taken.isError ? (
          <ErrorState error={taken.error} onRetry={() => void taken.refetch()} className="py-6" />
        ) : times.length === 0 ? (
          <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">{t("book.branch.noTimes")}</p>
        ) : (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
            {times.map((m) => {
              const free = freeCount(m);
              return (
                <Chip key={m} active={m === start} disabled={free === 0} onClick={() => setStart(m === start ? null : m)} className="min-w-18">
                  <span className="font-num text-base">{hhmm(m)}</span>
                  <span className="text-[0.7rem] font-medium opacity-80">{free === 0 ? t("book.branch.full") : t("book.branch.freeCount", { count: free })}</span>
                </Chip>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="pick-pitch" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pick-pitch" className="font-bold">{t("book.branch.pitch")}</h2>
          <div className="flex gap-1 rounded-xl bg-card p-1" role="group" aria-label={t("book.branch.sport")}>
            {[null, ...branchSports(branch)].map((s) => (
              <button
                key={s ?? "all"}
                type="button"
                aria-pressed={s === sport}
                onClick={() => { setSport(s); if (s && field && field.sport !== s) setFieldId(null); }}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring", s === sport ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {s ? t(`sport.${s}`) : t("common.all")}
              </button>
            ))}
          </div>
        </div>
        <PitchMap fields={branch.fields} states={states} sport={sport} selectedId={fieldId} onSelect={setFieldId} label={t("pitchMap.label", { name: branchName(branch, locale) })} />
        <PitchLegend />
      </section>

      <Summary field={field} date={date} start={start} duration={duration} free={field ? states[field.id] === "free" : false} onContinue={() => setFormOpen(true)} ready={ready} />

      {field && start !== null ? (
        <BookingForm
          open={formOpen}
          onOpenChange={setFormOpen}
          branch={branch}
          field={field}
          date={date}
          start={start}
          duration={duration}
          onBooked={onBooked}
          onTaken={onTaken}
          onError={(error) => toast.error(error instanceof HttpError && error.status === 0 ? t("book.errors.network") : t("book.errors.unavailable"))}
        />
      ) : null}
    </div>
  );
}

function Summary({ field, date, start, duration, free, ready, onContinue }: { field: Field | null; date: string; start: number | null; duration: number; free: boolean; ready: boolean; onContinue: () => void }) {
  const t = useTranslations();
  const dates = useDates();
  const hint = !field && start === null ? t("book.branch.hintBoth") : !field ? t("book.branch.hintPitch") : start === null ? t("book.branch.hintTime") : !free ? t("book.branch.hintTaken") : null;
  return (
    <section aria-live="polite" className={cn("z-20 flex flex-col gap-3 rounded-2xl bg-card p-4 sm:flex-row sm:items-center sm:justify-between", ready && "sticky bottom-3 shadow-[0_8px_30px_rgb(0_0_0/0.12)]")}>
      {field ? (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{field.name}</h3>
            <Badge variant="outline" className="font-num">{field.format}</Badge>
            <Badge variant="secondary">{field.indoor ? t("common.indoor") : t("common.outdoor")}</Badge>
            {field.lit ? <Lightbulb className="size-4 text-muted-foreground" aria-label={t("pitchMap.lit")} /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {dates.day(date)}
            {start !== null ? <span className="font-num"> · {hhmm(start)}–{hhmm(start + duration)}</span> : null}
            {" · "}
            {t("common.players", { count: field.maxPlayers })}
          </p>
          {start !== null ? <Price usd={priceFor(field, start, start + duration)} className="text-lg" /> : null}
        </div>
      ) : null}
      {hint ? <p className="text-sm font-medium text-muted-foreground">{hint}</p> : null}
      <Button size="lg" disabled={!ready} onClick={onContinue} className="shrink-0">
        <CalendarCheck />
        {t("book.branch.continue")}
      </Button>
    </section>
  );
}
