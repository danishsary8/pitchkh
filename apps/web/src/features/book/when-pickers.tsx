"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimeOption } from "@/lib/availability";
import { DURATIONS, hhmm } from "@/lib/booking-rules";
import { useDates } from "@/lib/format";
import { Chip, ScrollRow, Segmented, StepHeading } from "./controls";

/** "1h", "1h30", "2h" */
export const durationLabel = (minutes: number): string => (minutes % 60 === 0 ? `${minutes / 60}h` : `${Math.floor(minutes / 60)}h30`);

/** Step 1: the next two weeks, today first. */
export function DayPicker({ days, value, onChange }: { days: readonly string[]; value: string; onChange: (date: string) => void }) {
  const t = useTranslations();
  const dates = useDates();
  return (
    <section aria-labelledby="pick-day" className="flex flex-col gap-3">
      <StepHeading id="pick-day" n={1} done>
        {t("book.branch.day")}
      </StepHeading>
      <ScrollRow wrap={false}>
        {days.map((d, i) => (
          <Chip key={d} active={d === value} onClick={() => onChange(d)} className="min-w-[4.25rem]" label={dates.dayLong(d)}>
            <span className="text-xs font-medium opacity-80">{i === 0 ? t("common.today") : dates.weekday(d)}</span>
            <span className="font-num text-xl leading-tight">{dates.dayOfMonth(d)}</span>
            <span className="text-xs font-medium opacity-80">{dates.month(d)}</span>
          </Chip>
        ))}
      </ScrollRow>
    </section>
  );
}

interface TimePickerProps {
  duration: number;
  onDuration: (minutes: number) => void;
  options: readonly TimeOption[];
  value: number | null;
  onChange: (startMin: number) => void;
  status: "pending" | "error" | "success";
  error: unknown;
  onRetry: () => void;
}

/** Step 2: game length, then back-to-back blocks of that length with how many pitches are free. */
export function TimePicker({ duration, onDuration, options, value, onChange, status, error, onRetry }: TimePickerProps) {
  const t = useTranslations();
  return (
    <section aria-labelledby="pick-time" className="flex flex-col gap-3">
      <StepHeading
        id="pick-time"
        n={2}
        done={value !== null}
        aside={<Segmented label={t("book.branch.duration")} value={duration} onChange={onDuration} options={DURATIONS.map((d) => ({ value: d, label: durationLabel(d) }))} className="font-num" />}
      >
        {t("book.branch.time")}
      </StepHeading>
      {status === "pending" ? (
        <ScrollRow>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-32 shrink-0 rounded-2xl" />
          ))}
        </ScrollRow>
      ) : status === "error" ? (
        <ErrorState error={error} onRetry={onRetry} className="py-6" />
      ) : options.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{t("book.branch.noTimes")}</p>
      ) : (
        <ScrollRow>
          {options.map((o) => (
            <Chip key={o.startMin} active={o.startMin === value} disabled={o.freeCount === 0} onClick={() => onChange(o.startMin)} className="min-w-[7.5rem]">
              <span className="font-num text-base whitespace-nowrap">
                {hhmm(o.startMin)}
                <span className="opacity-60"> – </span>
                {hhmm(o.endMin)}
              </span>
              <span className="text-[0.72rem] font-medium opacity-80">{o.freeCount === 0 ? t("book.branch.full") : t("book.branch.freeCount", { count: o.freeCount })}</span>
            </Chip>
          ))}
        </ScrollRow>
      )}
    </section>
  );
}
