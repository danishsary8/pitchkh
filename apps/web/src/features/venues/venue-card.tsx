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
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { useVenueText } from "./text";

export function VenueCard({ venue, priority = false, className, href }: { venue: VenueSummary; priority?: boolean; className?: string; href?: string }) {
  const t = useTranslations();
  const text = useVenueText();
  const transitionVenue = useUiStore((s) => s.transitionVenue);
  const setTransitionVenue = useUiStore((s) => s.setTransitionVenue);
  const photo = venue.photos[0] ?? null;
  const morphing = transitionVenue?.slug === venue.slug;

  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl bg-card", className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-pitch">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
            style={morphing ? { viewTransitionName: "venue-photo" } : undefined}
          />
        ) : null}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {venue.featured ? <Badge variant="accent">{t("common.featured")}</Badge> : null}
          {venue.availableFieldCount ? <Badge variant="default">{t("venues.fieldsFree", { count: venue.availableFieldCount })}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug font-bold text-balance">
            <Link
              href={href ?? `/venues/${venue.slug}`}
              onClick={() => setTransitionVenue({ slug: venue.slug, photo, name: text.name(venue) })}
              className="rounded-md outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
            >
              {text.name(venue)}
            </Link>
            {venue.verified ? <BadgeCheck className="ml-1 inline size-4.5 -translate-y-px text-primary" aria-label={t("common.verified")} /> : null}
          </h3>
          <Rating value={venue.rating} count={venue.reviewCount} className="shrink-0 pt-0.5" />
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {venue.district}, {t(`province.${venue.province}`)}
          </span>
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <ul className="flex flex-wrap gap-1.5" aria-label={t("venues.sportsOffered")}>
            {venue.sports.map((sport) => (
              <li key={sport} className={cn("grid size-8 place-items-center rounded-full", sport === "football" ? "bg-football/12 text-football" : sport === "volleyball" ? "bg-volleyball/12 text-volleyball" : "bg-tennis/12 text-tennis")} title={t(`sport.${sport}`)}>
                <SportIcon sport={sport} className="size-4.5" />
                <span className="sr-only">{t(`sport.${sport}`)}</span>
              </li>
            ))}
          </ul>
          <p className="text-right text-sm leading-tight">
            <span className="text-muted-foreground">{t("common.from")} </span>
            <Price usd={venue.priceFromUsd} className="text-base" />
            <span className="text-muted-foreground"> /{t("venues.hr")}</span>
          </p>
        </div>
      </div>
      <FavoriteButton venueId={venue.id} isFavorite={venue.isFavorite} className="absolute top-2.5 right-2.5 z-10" />
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
