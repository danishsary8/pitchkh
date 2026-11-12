"use client";

import { APP, formatKhr, formatUsd, usdToKhr } from "@pitchkh/shared";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useMemo } from "react";

/** "2026-11-14" -> Date at Phnom Penh midnight. */
export const dateFromStr = (date: string): Date => new Date(`${date}T00:00:00${APP.utcOffset}`);

/** Date/time formatting pinned to Asia/Phnom_Penh, in the active language. */
export function useDates() {
  const format = useFormatter();
  const t = useTranslations("common");
  const now = useNow();
  return useMemo(() => {
    const tz = { timeZone: APP.timezone } as const;
    const todayStr = new Intl.DateTimeFormat("en-CA", tz).format(now);
    const tomorrowStr = new Intl.DateTimeFormat("en-CA", tz).format(new Date(now.getTime() + 86_400_000));
    return {
      /** "Sat 14 Nov" (or Today / Tomorrow) */
      day: (date: string, relative = true): string => {
        if (relative && date === todayStr) return t("today");
        if (relative && date === tomorrowStr) return t("tomorrow");
        return format.dateTime(dateFromStr(date), { weekday: "short", day: "numeric", month: "short", ...tz });
      },
      dayLong: (date: string): string => format.dateTime(dateFromStr(date), { weekday: "long", day: "numeric", month: "long", year: "numeric", ...tz }),
      weekday: (date: string): string => format.dateTime(dateFromStr(date), { weekday: "short", ...tz }),
      dayOfMonth: (date: string): string => format.dateTime(dateFromStr(date), { day: "numeric", ...tz }),
      month: (date: string): string => format.dateTime(dateFromStr(date), { month: "short", ...tz }),
      /** ISO instant -> "18:00" */
      time: (iso: string): string => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...tz }),
      range: (startAt: string, endAt: string): string =>
        `${format.dateTime(new Date(startAt), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...tz })} – ${format.dateTime(new Date(endAt), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...tz })}`,
      dateTime: (iso: string): string => format.dateTime(new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...tz }),
      ago: (iso: string): string => format.relativeTime(new Date(iso), now),
      today: todayStr,
    };
  }, [format, now, t]);
}

export function useMoney() {
  const locale = useLocale();
  return useMemo(
    () => ({
      usd: (amount: number): string => formatUsd(amount),
      khr: (usd: number): string => formatKhr(usdToKhr(usd)),
      locale,
    }),
    [locale],
  );
}
