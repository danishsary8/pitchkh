"use client";

import { APP, minutesOf, timeOf, type Field, type Sport, type VenueDetail } from "@pitchkh/shared";
import { Hand } from "lucide-react";
import { useTranslations } from "next-intl";
import { SportIcon } from "@/components/brand/pitch-art";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherHint } from "@/features/venues/weather-hint";
import { freeAt, pitchStates, startOptions } from "@/features/pitch-map/availability";
import { PitchCard } from "@/features/pitch-map/pitch-card";
import { PitchLegend, PitchMap } from "@/features/pitch-map/pitch-map";
import { useVenueDay } from "@/features/pitch-map/use-venue-day";
import { useDates } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BookingDraft } from "./draft-store";
import { DateStrip, SlotGrid } from "./slot-picker";

type Update = (patch: Partial<BookingDraft>) => void;

const chip = "press flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-card px-4 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground disabled:opacity-40";

/** The range that a "time first" pick pre-fills: the shortest bookable game. */
const presetRange = (start: string) => ({ startTime: start, endTime: timeOf(minutesOf(start) + APP.minBookingMinutes) });

/**
 * Screen 1 of 2: sport, day, pitch and time on one screen. Players can tap a
 * pitch on the map first, or tap a start time first and see which pitches are
 * free then.
 */
export function StepPick({ venue, draft, update }: { venue: VenueDetail; draft: BookingDraft; update: Update }) {
  const t = useTranslations();
  const dates = useDates();
  const date = draft.date ?? dates.today;
  const field = venue.fields.find((f) => f.id === draft.fieldId);
  const sport: Sport = draft.sport ?? field?.sport ?? venue.sports[0] ?? "football";
  const sportFields = venue.fields.filter((f) => f.sport === sport);
  const bookable = sportFields.filter((f) => f.status === "active");
  const showMap = venue.fields.length > 1;
  const { data: day, isPending } = useVenueDay(venue.id, date);
  const states = pitchStates(day, draft.wantedStart);
  const options = startOptions(day, new Set(bookable.map((f) => f.id)));
  const range = draft.startTime && draft.endTime ? { startTime: draft.startTime, endTime: draft.endTime } : null;

  const pickField = (next: Field): void => {
    const fieldDay = day?.fields.find((f) => f.fieldId === next.id);
    // Free at the chosen start: pre-fill that game. Otherwise drop the time filter and show the whole day.
    const fits = !!draft.wantedStart && !!fieldDay && freeAt(fieldDay, draft.wantedStart);
    update({ fieldId: next.id, sport: next.sport, teamSize: null, ...(fits && draft.wantedStart ? presetRange(draft.wantedStart) : { startTime: null, endTime: null, wantedStart: null }) });
  };

  const pickStart = (start: string | null): void => {
    if (!start) return update({ wantedStart: null });
    const fieldDay = field ? day?.fields.find((f) => f.fieldId === field.id) : undefined;
    // Keep the pitch if it is free then; otherwise let the map show what is.
    if (fieldDay && freeAt(fieldDay, start)) update({ wantedStart: start, ...presetRange(start) });
    else update({ wantedStart: start, fieldId: venue.fields.length > 1 ? null : (field?.id ?? null), startTime: null, endTime: null });
  };

  const freeNow = draft.wantedStart ? options.find((o) => o.time === draft.wantedStart)?.freeCount ?? 0 : null;

  return (
    <div className="flex flex-col gap-5">
      {venue.sports.length > 1 ? (
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("venues.filterSport")}>
          {venue.sports.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sport === s} onClick={() => update({ sport: s, fieldId: field?.sport === s ? field.id : null, startTime: field?.sport === s ? draft.startTime : null, endTime: field?.sport === s ? draft.endTime : null })} className="press flex h-14 items-center justify-center gap-2 rounded-2xl bg-card text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground">
              <SportIcon sport={s} className="size-5" />
              {t(`sport.${s}`)}
            </button>
          ))}
        </div>
      ) : null}

      <section className="flex flex-col gap-2.5" aria-labelledby="day-label">
        <h2 id="day-label" className="font-bold">{t("booking.pickDay")}</h2>
        <DateStrip value={date} onChange={(d) => update({ date: d, startTime: null, endTime: null, wantedStart: null })} labelId="day-label" />
      </section>

      {showMap && bookable.length > 1 ? (
        <section className="flex flex-col gap-2.5" aria-labelledby="start-label">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="start-label" className="font-bold">{t("booking.startAround")}</h2>
            {freeNow !== null ? <p className="text-sm text-muted-foreground" aria-live="polite">{t("booking.freeAtTime", { count: freeNow, time: draft.wantedStart ?? "" })}</p> : null}
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-labelledby="start-label">
            <button type="button" role="radio" aria-checked={!draft.wantedStart} onClick={() => pickStart(null)} className={chip}>{t("booking.anyTime")}</button>
            {isPending
              ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11 w-16 shrink-0 rounded-full" />)
              : options.map((o) => (
                  <button key={o.time} type="button" role="radio" aria-checked={draft.wantedStart === o.time} disabled={o.freeCount === 0} onClick={() => pickStart(o.time)} className={cn(chip, "font-num")} aria-label={t("booking.startChip", { time: o.time, count: o.freeCount })}>
                    {o.time}
                  </button>
                ))}
          </div>
        </section>
      ) : null}

      {showMap ? (
        <section className="flex flex-col gap-2.5" aria-labelledby="map-label">
          <div>
            <h2 id="map-label" className="font-bold">{t("booking.pickPitch")}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Hand className="size-4" aria-hidden />
              {t("booking.pickPitchHint")}
            </p>
          </div>
          <PitchMap fields={venue.fields} selectedId={field?.id} states={day ? states : undefined} sport={venue.sports.length > 1 ? sport : null} onSelect={(id) => { const next = venue.fields.find((f) => f.id === id); if (next) pickField(next); }} label={t("pitchMap.label", { name: venue.name })} />
          <PitchLegend />
          {draft.wantedStart && freeNow === 0 ? <p className="rounded-2xl bg-warning-surface p-3 text-sm text-warning">{t("booking.noneFree")}</p> : null}
        </section>
      ) : null}

      {field ? (
        <>
          <PitchCard field={field} />
          {!field.indoor ? <WeatherHint province={venue.province} date={date} /> : null}
          <section className="flex flex-col gap-2.5" aria-labelledby="time-label">
            <div>
              <h2 id="time-label" className="font-bold">{t("booking.pickTime")}</h2>
              <p className="text-sm text-muted-foreground">{t("booking.pickTimeHint", { min: APP.minBookingMinutes / 60, max: APP.maxBookingMinutes / 60 })}</p>
            </div>
            <SlotGrid key={`${field.id}-${date}`} fieldId={field.id} date={date} value={range} onChange={(next) => update({ startTime: next?.startTime ?? null, endTime: next?.endTime ?? null })} />
          </section>
        </>
      ) : showMap ? (
        <p className="rounded-2xl border-2 border-dashed border-border p-5 text-center text-muted-foreground">{t("booking.hintField")}</p>
      ) : null}
    </div>
  );
}
