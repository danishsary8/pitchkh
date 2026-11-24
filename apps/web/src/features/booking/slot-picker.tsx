"use client";

import { addDays, APP, minutesOf, selectRange, type Slot } from "@pitchkh/shared";
import { useQuery } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

export interface TimeRange {
  startTime: string;
  endTime: string;
}

/** Horizontal strip of the next days. Thumb-sized, scrolls sideways on phones. */
export function DateStrip({ value, onChange, days = 14, labelId }: { value: string; onChange: (date: string) => void; days?: number; labelId?: string }) {
  const dates = useDates();
  const list = Array.from({ length: days }, (_, i) => addDays(dates.today, i));
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="radiogroup" aria-labelledby={labelId}>
      {list.map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={d === value}
          aria-label={dates.dayLong(d)}
          onClick={() => onChange(d)}
          className="press flex h-[4.5rem] w-[3.75rem] shrink-0 snap-start flex-col items-center justify-center rounded-2xl bg-card text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground"
        >
          <span className="text-xs">{dates.weekday(d)}</span>
          <span className="font-num text-xl leading-tight font-bold">{dates.dayOfMonth(d)}</span>
          <span className="text-[0.7rem]">{dates.month(d)}</span>
        </button>
      ))}
    </div>
  );
}

const minSlots = APP.minBookingMinutes / APP.slotMinutes;

/**
 * The live slot grid for one field and day. Tap the first half-hour, then the
 * last one; the range fills in between and a live line shows the end time. Booked, blocked and past slots are disabled,
 * and a range can never jump over one (conflict detection from packages/shared).
 */
export function SlotGrid({ fieldId, date, value, onChange }: { fieldId: string; date: string; value: TimeRange | null; onChange: (range: TimeRange | null) => void }) {
  const t = useTranslations("booking");
  const reduce = useReducedMotion();
  const [anchor, setAnchor] = useState<number | null>(null);
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.availability(fieldId, date), queryFn: () => api.venues.availability(fieldId, date), staleTime: 15_000 });

  if (isPending) {
    return (
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6" aria-busy aria-label={t("loadingSlots")}>
        {Array.from({ length: 24 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} className="py-6" />;
  if (data.closed || data.slots.length === 0) return <EmptyState icon={<CalendarX />} title={t("closedTitle")} body={t("closedBody")} className="py-8" />;

  const slots = data.slots;
  const from = value ? slots.findIndex((s) => s.start === value.startTime) : -1;
  const to = value ? slots.findIndex((s) => s.end === value.endTime) : -1;
  const free = (i: number): boolean => slots[i]?.status === "available";

  const tap = (index: number): void => {
    // Second tap extends the range from the anchor; otherwise start a new one.
    if (anchor !== null && index !== anchor) {
      const range = selectRange(slots, anchor, index);
      if (range.to - range.from + 1 >= minSlots) {
        onChange({ startTime: (slots[range.from] as Slot).start, endTime: (slots[range.to] as Slot).end });
        setAnchor(null);
        return;
      }
    }
    // A new start: pre-select the minimum bookable length when the next slots are free.
    const end = index + minSlots - 1;
    const fits = Array.from({ length: minSlots }, (_, k) => free(index + k)).every(Boolean);
    setAnchor(index);
    onChange(fits ? { startTime: (slots[index] as Slot).start, endTime: (slots[end] as Slot).end } : null);
  };

  return (
    <div className="flex flex-col gap-3">
      <motion.ol key={`${fieldId}-${date}`} className="grid grid-cols-4 gap-1.5 sm:grid-cols-6" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.012 } } }} aria-label={t("slotGrid")}>
        {slots.map((slot, i) => {
          const selected = i >= from && i <= to && from >= 0;
          const edge = selected && (i === from || i === to);
          const disabled = slot.status !== "available";
          return (
            <motion.li key={slot.start} variants={{ hidden: { opacity: 0, transform: reduce ? "scale(1)" : "scale(0.9)" }, show: { opacity: 1, transform: "scale(1)", transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } } }}>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`${slot.start} – ${slot.end}, ${t(`slot.${selected ? "selected" : slot.status}`)}, $${slot.priceUsd}`}
                onClick={() => tap(i)}
                className={cn(
                  "press font-num relative flex h-12 w-full flex-col items-center justify-center rounded-xl text-[0.95rem] leading-none font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  selected ? (edge ? "bg-primary text-primary-foreground" : "bg-primary/80 text-primary-foreground") : "bg-card text-foreground",
                  disabled && "bg-transparent text-muted-foreground/70 line-through decoration-1",
                  slot.status === "booked" && "bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--border)_5px_6px)]",
                  slot.status === "blocked" && "bg-warning-surface/60 no-underline",
                )}
              >
                {slot.start}
                {slot.peak && !disabled ? <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-accent" /> : null}
              </button>
            </motion.li>
          );
        })}
      </motion.ol>
      {/* Says exactly when the game ends, since the last tapped half-hour is included. */}
      <div aria-live="polite">
        {value ? (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl bg-primary/10 px-3 py-2.5 text-sm">
            <span className="font-num font-bold text-primary">{t("rangePicked", { start: value.startTime, end: value.endTime, hours: (minutesOf(value.endTime) - minutesOf(value.startTime)) / 60 })}</span>
            {anchor !== null ? <span className="text-muted-foreground">{t("rangeExtend")}</span> : null}
          </p>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label={t("legend")}>
        <li className="flex items-center gap-1.5"><span className="size-3.5 rounded bg-card ring-1 ring-border" />{t("slot.available")}</li>
        <li className="flex items-center gap-1.5"><span className="size-3.5 rounded bg-primary" />{t("slot.selected")}</li>
        <li className="flex items-center gap-1.5"><span className="size-3.5 rounded bg-[repeating-linear-gradient(135deg,transparent_0_3px,var(--input)_3px_4px)] ring-1 ring-border" />{t("slot.booked")}</li>
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" />{t("peakRate")}</li>
      </ul>
    </div>
  );
}
