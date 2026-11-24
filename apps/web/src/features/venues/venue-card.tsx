"use client";

import type { VenueSummary } from "@pitchkh/shared";
import { BadgeCheck, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { SportIcon } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";
import { Rating } from "@/components/common/page";
import { Price } from "@/components/common/price";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDates } from "@/lib/format";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { useVenueText } from "./text";

/** "3 × 6v6 · 1 × 10v10": what sizes of pitch a venue has. */
export function PitchFormats({ formats, className }: { formats: VenueSummary["pitchFormats"]; className?: string }) {
  const t = useTranslations("sport");
  if (formats.length === 0) return null;
  // "5v5" says enough for football and volleyball; tennis courts are all the same, so name the sport.
  const label = (f: VenueSummary["pitchFormats"][number]): string => (/^\d+v\d+$/.test(f.format) ? f.format : t(f.sport));
  return (
    <p className={cn("font-num truncate text-sm text-muted-foreground", className)}>
      {formats.map((f) => `${f.count} × ${label(f)}`).join(" · ")}
    </p>
  );
}

/** One-tap booking chips: tapping a time opens the booking screen with that start time picked. */
export function NextFreeTimes({ venue, className }: { venue: VenueSummary; className?: string }) {
  const t = useTranslations("venues");
  const dates = useDates();
  if (!venue.nextFree) return null;
  const { date, times } = venue.nextFree;
  return (
    <div className={cn("relative z-10 flex items-center gap-1.5", className)}>
      <span className="mr-0.5 flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        {dates.day(date)}
      </span>
      <ul className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto" aria-label={t("nextFree", { day: dates.day(date) })}>
        {times.map((time) => (
          <li key={time}>
            <Link href={`/book/${venue.slug}?date=${date}&time=${time}`} className="press font-num flex h-9 min-w-[3.75rem] items-center justify-center rounded-full bg-primary/10 px-3 text-sm font-bold text-primary outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("bookAt", { time, day: dates.day(date) })}>
              {time}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Venue card. "auto" lays it out as a compact row on phones (photo left) so a
 * list fits more venues per screen, and as a tall card from the sm breakpoint.
 */
export function VenueCard({ venue, priority = false, className, href, layout = "stack" }: { venue: VenueSummary; priority?: boolean; className?: string; href?: string; layout?: "auto" | "stack" }) {
  const t = useTranslations();
  const text = useVenueText();
  const transitionVenue = useUiStore((s) => s.transitionVenue);
  const setTransitionVenue = useUiStore((s) => s.setTransitionVenue);
  const photo = venue.photos[0] ?? null;
  const morphing = transitionVenue?.slug === venue.slug;
  const row = layout === "auto";

  return (
    <article className={cn("group relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card", className)}>
      <div className={cn("flex", row ? "max-sm:gap-3 max-sm:p-3 sm:flex-col" : "flex-col")}>
        <div className={cn("relative shrink-0 overflow-hidden bg-pitch", row ? "max-sm:size-[6.5rem] max-sm:rounded-xl sm:aspect-[16/10]" : "aspect-[16/10]")}>
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              priority={priority}
              sizes={row ? "(min-width: 1280px) 400px, (min-width: 640px) 50vw, 112px" : "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"}
              className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
              style={morphing ? { viewTransitionName: "venue-photo" } : undefined}
            />
          ) : null}
          <div className={cn("absolute top-3 left-3 flex flex-wrap gap-1.5", row && "max-sm:top-1.5 max-sm:left-1.5")}>
            {venue.featured ? <Badge variant="accent" className={cn(row && "max-sm:px-1.5 max-sm:text-[0.65rem]")}>{t("common.featured")}</Badge> : null}
            {venue.availableFieldCount ? <Badge variant="default" className={cn(row && "max-sm:hidden")}>{t("venues.fieldsFree", { count: venue.availableFieldCount })}</Badge> : null}
          </div>
        </div>
        <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", row ? "max-sm:pr-8 sm:gap-2.5 sm:p-4" : "gap-2.5 p-4")}>
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn("leading-snug font-bold text-balance", row ? "max-sm:text-base sm:text-lg" : "text-lg")}>
              <Link
                href={href ?? `/venues/${venue.slug}`}
                onClick={() => setTransitionVenue({ slug: venue.slug, photo, name: text.name(venue) })}
                className="rounded-md outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
              >
                {text.name(venue)}
              </Link>
              {venue.verified ? <BadgeCheck className="ml-1 inline size-4.5 -translate-y-px text-primary" aria-label={t("common.verified")} /> : null}
            </h3>
            <Rating value={venue.rating} count={venue.reviewCount} className={cn("shrink-0 pt-0.5", row && "max-sm:hidden")} />
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {row ? <Rating value={venue.rating} count={venue.reviewCount} className="mr-1.5 shrink-0 sm:hidden" /> : null}
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {venue.district}
              <span className={cn(row && "max-sm:hidden")}>, {t(`province.${venue.province}`)}</span>
            </span>
          </p>
          <PitchFormats formats={venue.pitchFormats} />
          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <ul className={cn("flex flex-wrap gap-1.5", row && "max-sm:hidden")} aria-label={t("venues.sportsOffered")}>
              {venue.sports.map((sport) => (
                <li key={sport} className={cn("grid size-8 place-items-center rounded-full", sport === "football" ? "bg-football/12 text-football" : sport === "volleyball" ? "bg-volleyball/12 text-volleyball" : "bg-tennis/12 text-tennis")} title={t(`sport.${sport}`)}>
                  <SportIcon sport={sport} className="size-4.5" />
                  <span className="sr-only">{t(`sport.${sport}`)}</span>
                </li>
              ))}
            </ul>
            <p className={cn("text-sm leading-tight", row ? "max-sm:text-left sm:text-right" : "text-right")}>
              <span className="text-muted-foreground">{t("common.from")} </span>
              <Price usd={venue.priceFromUsd} className="text-base" />
              <span className="text-muted-foreground"> /{t("venues.hr")}</span>
            </p>
          </div>
        </div>
      </div>
      <NextFreeTimes venue={venue} className={cn("border-t border-border px-3 py-2.5", !row && "sm:px-4")} />
      <FavoriteButton venueId={venue.id} isFavorite={venue.isFavorite} className={cn("absolute top-2.5 right-2.5 z-10", row && "max-sm:top-2 max-sm:right-2 max-sm:bg-secondary max-sm:text-foreground")} />
    </article>
  );
}

export function VenueCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card" aria-hidden>
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </div>
  );
}
