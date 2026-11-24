"use client";

import { APP, dateInPP, formatKhr, formatUsd, usdToKhr } from "@pitchkh/shared";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useMemo } from "react";

/** "2026-11-14" -> Date at Phnom Penh midnight. */
export const dateFromStr = (date: string): Date => new Date(`${date}T00:00:00${APP.utcOffset}`);

/**
 * Date/time formatting pinned to Asia/Phnom_Penh, in the active language.
 * English uses the browser's Intl data. Khmer builds dates from our own names
 * (calendar.* in km.json): many browsers ship no Khmer date data and would fall
 * back to English, and the server and browser must render the same text.
 */
export function useDates() {
  const format = useFormatter();
  const t = useTranslations("common");
  const tc = useTranslations("calendar");
  const locale = useLocale();
  const now = useNow();
  return useMemo(() => {
    const tz = { timeZone: APP.timezone } as const;
    const todayStr = new Intl.DateTimeFormat("en-CA", tz).format(now);
    const tomorrowStr = new Intl.DateTimeFormat("en-CA", tz).format(new Date(now.getTime() + 86_400_000));
    const clock = (iso: string): string => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...tz });

    // Khmer: "YYYY-MM-DD" (a Phnom Penh calendar day) -> its parts and names.
    const own = locale === "km";
    const list = (key: "weekdays" | "weekdaysShort" | "months" | "monthsShort") => tc(key).split("|");
    const names = { weekdays: list("weekdays"), weekdaysShort: list("weekdaysShort"), months: list("months"), monthsShort: list("monthsShort") };
    const parts = (date: string) => {
      const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
      return { year, month: month - 1, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
    };

    return {
      /** "Sat 14 Nov" (or Today / Tomorrow) */
      day: (date: string, relative = true): string => {
        if (relative && date === todayStr) return t("today");
        if (relative && date === tomorrowStr) return t("tomorrow");
        if (!own) return format.dateTime(dateFromStr(date), { weekday: "short", day: "numeric", month: "short", ...tz });
        const p = parts(date);
        return tc("day", { weekday: names.weekdays[p.weekday] ?? "", day: p.day, month: names.monthsShort[p.month] ?? "" });
      },
      dayLong: (date: string): string => {
        if (!own) return format.dateTime(dateFromStr(date), { weekday: "long", day: "numeric", month: "long", year: "numeric", ...tz });
        const p = parts(date);
        return tc("dayLong", { weekday: names.weekdays[p.weekday] ?? "", day: p.day, month: names.months[p.month] ?? "", year: p.year });
      },
      weekday: (date: string): string => (own ? (names.weekdaysShort[parts(date).weekday] ?? "") : format.dateTime(dateFromStr(date), { weekday: "short", ...tz })),
      dayOfMonth: (date: string): string => (own ? String(parts(date).day) : format.dateTime(dateFromStr(date), { day: "numeric", ...tz })),
      month: (date: string): string => (own ? (names.monthsShort[parts(date).month] ?? "") : format.dateTime(dateFromStr(date), { month: "short", ...tz })),
      /** ISO instant -> "18:00" */
      time: clock,
      range: (startAt: string, endAt: string): string => `${clock(startAt)} – ${clock(endAt)}`,
      dateTime: (iso: string): string => {
        if (!own) return format.dateTime(new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...tz });
        const p = parts(dateInPP(iso));
        return tc("dateTime", { day: p.day, month: names.monthsShort[p.month] ?? "", time: clock(iso) });
      },
      ago: (iso: string): string => {
        if (!own) return format.relativeTime(new Date(iso), now);
        const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
        if (minutes < 1) return tc("justNow");
        if (minutes < 60) return tc("minutesAgo", { count: minutes });
        if (minutes < 24 * 60) return tc("hoursAgo", { count: Math.round(minutes / 60) });
        if (minutes < 30 * 24 * 60) return tc("daysAgo", { count: Math.round(minutes / (24 * 60)) });
        const p = parts(dateInPP(iso));
        return tc("day", { weekday: names.weekdays[p.weekday] ?? "", day: p.day, month: names.monthsShort[p.month] ?? "" });
      },
      today: todayStr,
    };
  }, [format, now, t, tc, locale]);
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
