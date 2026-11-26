"use client";

import { APP, minutesOf } from "@pitchkh/shared";
import { useTranslations } from "next-intl";
import { type Booking, hhmm, isPast, STAFF_GRACE_MIN } from "@/lib/booking-rules";
import type { Branch } from "@/lib/branches";
import { cn } from "@/lib/utils";

const PX_PER_HOUR = 88;

/**
 * One row per pitch, one column per hour. Bookings are blocks on the row;
 * an empty half hour is a button that starts a walk-in booking there.
 */
export function DayGrid({ branch, date, bookings, onOpen, onEmpty }: { branch: Branch; date: string; bookings: Booking[]; onOpen: (id: string) => void; onEmpty: (fieldId: string, startMin: number) => void }) {
  const t = useTranslations("staff");
  const open = minutesOf(branch.open);
  const close = minutesOf(branch.close);
  const hours = Array.from({ length: Math.ceil((close - open) / 60) }, (_, i) => open + i * 60);
  const halves = Array.from({ length: (close - open) / APP.slotMinutes }, (_, i) => open + i * APP.slotMinutes);
  const width = ((close - open) / 60) * PX_PER_HOUR;
  const x = (m: number): number => ((m - open) / 60) * PX_PER_HOUR;
  const live = bookings.filter((b) => b.status !== "cancelled");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl bg-card">
        <div className="relative" style={{ width: width + 112 }}>
          <div className="sticky top-0 flex border-b border-border text-xs text-muted-foreground">
            <div className="sticky left-0 z-10 w-28 shrink-0 bg-card" />
            {hours.map((h) => (
              <div key={h} className="font-num shrink-0 border-l border-border px-1.5 py-1.5" style={{ width: PX_PER_HOUR }}>
                {hhmm(h)}
              </div>
            ))}
          </div>
          {branch.fields.map((field) => (
            <div key={field.id} className="flex border-b border-border last:border-b-0">
              <div className="sticky left-0 z-10 flex w-28 shrink-0 flex-col justify-center bg-card px-3 py-2">
                <span className="truncate text-sm font-bold">{field.name}</span>
                <span className="font-num text-xs text-muted-foreground">{field.format}</span>
              </div>
              <div className="relative h-16 shrink-0" style={{ width }}>
                {halves.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-label={t("addAt", { pitch: field.name, time: hhmm(m) })}
                    disabled={isPast(date, m, new Date(), STAFF_GRACE_MIN)}
                    onClick={() => onEmpty(field.id, m)}
                    className="absolute inset-y-0 border-l border-border/50 outline-none hover:bg-secondary focus-visible:bg-secondary disabled:pointer-events-none"
                    style={{ left: x(m), width: PX_PER_HOUR / 2 }}
                  />
                ))}
                {live
                  .filter((b) => b.fieldId === field.id)
                  .map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onOpen(b.id)}
                      className={cn(
                        "absolute inset-y-1.5 flex flex-col overflow-hidden rounded-lg px-2 py-1 text-left text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring",
                        b.status === "pending" ? "bg-warning text-white" : "bg-primary text-primary-foreground",
                      )}
                      style={{ left: x(b.startMin) + 2, width: x(b.endMin) - x(b.startMin) - 4 }}
                    >
                      <span className="truncate font-bold">{b.name}</span>
                      <span className="font-num truncate opacity-90">{hhmm(b.startMin)}–{hhmm(b.endMin)}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {cancelled.length ? (
        <details className="rounded-2xl bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">{t("cancelledCount", { count: cancelled.length })}</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {cancelled.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => onOpen(b.id)} className="font-num text-left text-muted-foreground hover:text-foreground">
                  {b.code} · {b.name} · {branch.fields.find((f) => f.id === b.fieldId)?.name} · {hhmm(b.startMin)}–{hhmm(b.endMin)}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
