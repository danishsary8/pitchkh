"use client";

import { addDays, PROVINCES, SPORTS, timeInPP, type Province, type Sport } from "@pitchkh/shared";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { SportIcon } from "@/components/brand/pitch-art";
import { Link, useNavigate } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchCard, MatchCardSkeleton } from "@/features/matches/match-card";
import { useVenueText } from "@/features/venues/text";
import { VenueCard, VenueCardSkeleton } from "@/features/venues/venue-card";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { useIsClient } from "@/lib/hooks";
import { qk } from "@/lib/query";

/*
 * The interactive parts of the home page. Everything else on the page is a
 * server component (see home.tsx), so its markup ships with no JavaScript.
 */

export function SearchCard() {
  const t = useTranslations();
  const dates = useDates();
  const navigate = useNavigate();
  const [sport, setSport] = useState<Sport | "">("football");
  const [province, setProvince] = useState<Province | "">("phnom_penh");
  const [date, setDate] = useState("");
  // Dates are formatted in the browser only: the page is prerendered, and Node and browsers format Khmer dates differently.
  const client = useIsClient();
  const days = client ? Array.from({ length: 14 }, (_, i) => addDays(dates.today, i)) : [];

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (province) params.set("province", province);
    if (date) {
      params.set("date", date);
      params.set("from", "18:00");
    }
    navigate(`/venues?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground shadow-xl sm:p-5" aria-label={t("home.searchTitle")}>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("venues.filterSport")}>
        {SPORTS.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={sport === s} onClick={() => setSport(sport === s ? "" : s)} className="press flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-secondary text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground sm:text-sm">
            <SportIcon sport={s} className="size-5.5" />
            {t(`sport.${s}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select aria-label={t("venues.filterProvince")} value={province} onChange={(e) => setProvince(e.target.value as Province | "")}>
          <option value="">{t("province.all")}</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{t(`province.${p}`)}</option>)}
        </Select>
        <Select aria-label={t("venues.filterWhen")} value={date} onChange={(e) => setDate(e.target.value)}>
          <option value="">{t("venues.anyDay")}</option>
          {days.map((d) => <option key={d} value={d}>{dates.day(d)}</option>)}
        </Select>
      </div>
      <Button type="submit" size="lg" variant="accent">
        <Search />
        {t("home.searchCta")}
      </Button>
    </form>
  );
}

/** The live strip: which venues have a field free at the next evening hour, right now. */
export function FreeTonight() {
  const t = useTranslations();
  const text = useVenueText();
  const dates = useDates();
  const now = useNow();
  const hour = Number(timeInPP(now).slice(0, 2)) + 1;
  const late = hour > 21;
  const date = late ? addDays(dates.today, 1) : dates.today;
  const from = `${String(late ? 18 : Math.max(hour, 6)).padStart(2, "0")}:00`;
  const to = `${String(Number(from.slice(0, 2)) + 1).padStart(2, "0")}:00`;
  const query = { date, from, to, pageSize: 8, sort: "rating" as const };
  const { data, isPending, isError } = useQuery({ queryKey: qk.venues(query), queryFn: () => api.venues.list(query) });
  if (isError) return null;
  return (
    <section aria-labelledby="free-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <h2 id="free-title" className="text-base font-bold">
          {isPending ? t("home.freeLoading") : t("home.freeTitle", { count: data.meta.total, time: from, day: dates.day(date) })}
        </h2>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {isPending
          ? [0, 1, 2, 3].map((i) => <li key={i}><Skeleton className="h-16 w-52" /></li>)
          : data.data.map((venue) => (
              <li key={venue.id} className="snap-start">
                <Link href={`/book/${venue.slug}?date=${date}&from=${from}`} className="press flex h-16 w-56 items-center gap-3 rounded-2xl bg-card p-2 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-pitch">
                    {venue.photos[0] ? <Image src={venue.photos[0]} alt="" fill sizes="48px" className="object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{text.name(venue)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t("venues.fieldsFree", { count: venue.availableFieldCount ?? 0 })} · <span className="font-num">${venue.priceFromUsd}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

export function FeaturedVenues() {
  const featured = useQuery({ queryKey: qk.venues({ featured: true, pageSize: 6 }), queryFn: () => api.venues.list({ featured: true, pageSize: 6 }) });
  if (featured.isError) return null;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
      {featured.isPending
        ? [0, 1, 2].map((i) => (
            <div key={i} className="w-[82vw] max-w-sm shrink-0 md:w-auto md:max-w-none">
              <VenueCardSkeleton />
            </div>
          ))
        : featured.data.data.map((venue) => (
            <div key={venue.id} className="w-[82vw] max-w-sm shrink-0 snap-center md:w-auto md:max-w-none">
              <VenueCard venue={venue} className="h-full" />
            </div>
          ))}
    </div>
  );
}

export function OpenMatches() {
  const matches = useQuery({ queryKey: qk.matches({ pageSize: 3 }), queryFn: () => api.matches.list({ pageSize: 3 }) });
  return (
    <div className="flex flex-col gap-3 text-foreground">
      {matches.isPending ? [0, 1].map((i) => <MatchCardSkeleton key={i} />) : matches.data?.data.map((match) => <MatchCard key={match.id} match={match} compact />)}
    </div>
  );
}
