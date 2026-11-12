"use client";

import type { Province, WeatherCondition } from "@pitchkh/shared";
import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

const ICONS: Record<WeatherCondition, typeof Sun> = { sunny: Sun, partly_cloudy: CloudSun, cloudy: Cloud, showers: CloudRain, storm: CloudLightning };

/** Weather hint for the day you plan to play. Rain matters: most pitches here are outdoors. */
export function WeatherHint({ province, date, className }: { province: Province; date: string; className?: string }) {
  const t = useTranslations("weather");
  const dates = useDates();
  const { data, isPending, isError } = useQuery({ queryKey: qk.weather(province, date), queryFn: () => api.venues.weather(province, date), staleTime: 3_600_000 });
  if (isError) return null;
  if (isPending) return <Skeleton className={cn("h-18", className)} />;
  const Icon = ICONS[data.condition];
  const wet = data.advice === "rain_likely" || data.advice === "storm";
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-3.5", wet ? "bg-warning-surface" : "bg-secondary", className)}>
      <Icon className={cn("size-9 shrink-0", wet ? "text-warning" : "text-primary")} aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-bold">
          {dates.day(date)} · {t(`condition.${data.condition}`)} · <span className="font-num">{data.tempMinC}–{data.tempMaxC}°C</span>
        </p>
        <p className="text-foreground/80">
          {t(`advice.${data.advice}`)} <span className="font-num">{t("rainChance", { percent: Math.round(data.rainChance * 100) })}</span>
        </p>
      </div>
    </div>
  );
}
