"use client";

import { addDays, AMENITIES, supportsMatching, weekdayOf, type Amenity, type Field, type Sport, type VenueDetail as Venue } from "@pitchkh/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Bath, Car, Coffee, Droplets, Flag, HeartPulse, Lightbulb, Lock, MapPin, MessageCircle, Navigation, Phone, Shirt, Snowflake, Swords, Users, Wifi, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/components/common/link";
import { Reveal } from "@/components/common/motion";
import { Container, Rating, SportBadge, Stars, StickyBar } from "@/components/common/page";
import { Price } from "@/components/common/price";
import { ErrorState, useErrorMessage } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { FieldViewer } from "@/features/field3d/field-viewer";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { ReportSheet } from "./report-sheet";
import { useVenueText } from "./text";
import { WeatherHint } from "./weather-hint";

const VenuesMap = dynamic(() => import("./venues-map"), { ssr: false, loading: () => <Skeleton className="size-full rounded-none" /> });

const AMENITY_ICONS: Record<Amenity, typeof Car> = {
  parking: Car, showers: Bath, changing_rooms: Shirt, floodlights: Lightbulb, cafe: Coffee, wifi: Wifi, equipment_rental: Wrench,
  spectator_seating: Users, first_aid: HeartPulse, drinking_water: Droplets, air_conditioning: Snowflake, lockers: Lock,
};

/** Swipeable on phones (scroll-snap, no JS carousel), a 3-up grid on desktop. */
function Gallery({ photos, name, morph }: { photos: string[]; name: string; morph: boolean }) {
  const t = useTranslations("venue");
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const onScroll = (): void => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  if (photos.length === 0) return <div className="pitch-stripes aspect-[16/10] w-full lg:aspect-[21/9] lg:rounded-3xl" />;
  return (
    <div className="relative">
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-[2fr_1fr] lg:grid-rows-2 lg:gap-2 lg:overflow-hidden lg:rounded-3xl" tabIndex={0} role="region" aria-label={t("gallery", { name })}>
        {photos.map((photo, i) => (
          <div key={photo} className={cn("relative aspect-[16/11] w-full shrink-0 snap-center bg-pitch lg:aspect-auto", i === 0 ? "lg:row-span-2 lg:min-h-[26rem]" : "lg:min-h-0")}>
            <Image src={photo} alt={t("photoAlt", { name, n: i + 1 })} fill priority={i === 0} sizes={i === 0 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"} className="object-cover" style={i === 0 && morph ? { viewTransitionName: "venue-photo" } : undefined} />
          </div>
        ))}
      </div>
      <p className="font-num absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white lg:hidden" aria-hidden>
        {index + 1} / {photos.length}
      </p>
    </div>
  );
}

function FieldRow({ field, slug, selected, onView }: { field: Field; slug: string; selected: boolean; onView: () => void }) {
  const t = useTranslations();
  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl bg-card p-4 transition-shadow sm:flex-row sm:items-center", selected && "ring-2 ring-primary")}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">{field.name}</h3>
          <Badge variant="outline" className="font-num">{field.format}</Badge>
          {field.status === "maintenance" ? <Badge variant="warning">{t("status.field.maintenance")}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {field.position} · {t(`surface.${field.surface}`)} · {field.indoor ? t("common.indoor") : t("common.outdoor")} · {t("common.players", { count: field.maxPlayers })}
        </p>
        <p className="text-sm">
          <Price usd={field.pricePerHourUsd} /> <span className="text-muted-foreground">/{t("venues.hr")}</span>
          {field.peakPricePerHourUsd !== field.pricePerHourUsd ? (
            <span className="text-muted-foreground">
              {" · "}
              {t("venue.peak")} <span className="font-num font-semibold text-foreground">${field.peakPricePerHourUsd}</span>
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onView} aria-pressed={selected}>
          {t("venue.seeIn3d")}
        </Button>
        <Button asChild className="flex-1 sm:flex-none" aria-disabled={field.status !== "active"}>
          <Link href={`/book/${slug}?field=${field.id}`}>{t("venue.bookField")}</Link>
        </Button>
      </div>
    </li>
  );
}

function Reviews({ venueId, rating, count }: { venueId: string; rating: number; count: number }) {
  const t = useTranslations();
  const dates = useDates();
  const { data, isPending } = useQuery({ queryKey: qk.reviews({ targetType: "venue", targetId: venueId, pageSize: 6 }), queryFn: () => api.reviews.list({ targetType: "venue", targetId: venueId, pageSize: 6 }) });
  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 id="reviews-title" className="font-display text-2xl">{t("venue.reviews")}</h2>
        <span className="flex items-center gap-2">
          <Stars value={rating} />
          <span className="font-num text-sm font-semibold">{count ? rating.toFixed(1) : ""}</span>
          <span className="text-sm text-muted-foreground">{t("common.reviews", { count })}</span>
        </span>
      </div>
      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : data && data.data.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.data.map((review) => (
            <li key={review.id} className="flex flex-col gap-2 rounded-2xl bg-card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={review.authorName} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{review.authorName}</p>
                  <p className="text-xs text-muted-foreground">{dates.ago(review.createdAt)}</p>
                </div>
                <Stars value={review.rating} />
              </div>
              <p className="text-[0.95rem] text-pretty">{review.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-card p-4 text-muted-foreground">{t("venue.noReviews")}</p>
      )}
    </section>
  );
}

function BookingCard({ venue, sport, date, onDate }: { venue: Venue; sport: Sport; date: string; onDate: (date: string) => void }) {
  const t = useTranslations();
  const dates = useDates();
  const days = Array.from({ length: 7 }, (_, i) => addDays(dates.today, i));
  const fields = venue.fields.filter((f) => f.sport === sport && f.status === "active");
  const from = fields.length ? Math.min(...fields.map((f) => f.pricePerHourUsd)) : venue.priceFromUsd;
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {t("common.from")} <Price usd={from} className="text-2xl text-foreground" /> /{t("venues.hr")}
      </p>
      <div>
        <p className="mb-2 text-sm font-semibold" id="when-label">{t("venue.whenPlaying")}</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-labelledby="when-label">
          {days.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={d === date} onClick={() => onDate(d)} className="press flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-secondary text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-primary aria-checked:text-primary-foreground">
              <span className="text-xs opacity-80">{dates.weekday(d)}</span>
              <span className="font-num text-lg font-bold">{dates.dayOfMonth(d)}</span>
            </button>
          ))}
        </div>
      </div>
      <WeatherHint province={venue.province} date={date} />
      <Button asChild size="lg">
        <Link href={`/book/${venue.slug}?sport=${sport}&date=${date}`}>{t("venue.bookNow")}</Link>
      </Button>
      <p className="text-center text-sm text-muted-foreground">{t("venue.freeCancel")}</p>
    </div>
  );
}

export function VenueDetailSkeleton() {
  const placeholder = useUiStore((s) => s.transitionVenue);
  return (
    <div aria-busy>
      <Container className="max-lg:px-0 lg:pt-6">
        <div className="relative aspect-[16/11] w-full overflow-hidden bg-pitch lg:aspect-[21/9] lg:rounded-3xl">
          {placeholder?.photo ? <Image src={placeholder.photo} alt="" fill priority sizes="100vw" className="object-cover" style={{ viewTransitionName: "venue-photo" }} /> : <Skeleton className="size-full rounded-none" />}
        </div>
      </Container>
      <Container className="flex flex-col gap-4 pt-5">
        {placeholder ? <h1 className="font-display text-3xl">{placeholder.name}</h1> : <Skeleton className="h-9 w-2/3" />}
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </Container>
    </div>
  );
}

export function VenueDetail({ slug }: { slug: string }) {
  const t = useTranslations();
  const text = useVenueText();
  const dates = useDates();
  const navigate = useNavigate();
  const { user } = useAuth();
  const errorMessage = useErrorMessage();
  const morph = useUiStore((s) => s.transitionVenue?.slug === slug);
  const { data: venue, isPending, isError, error, refetch } = useQuery({ queryKey: qk.venue(slug), queryFn: () => api.venues.get(slug) });
  const [sport, setSport] = useState<Sport | null>(null);
  const [viewField, setViewField] = useState<string | null>(null);
  const [date, setDate] = useState(dates.today);
  const [reportOpen, setReportOpen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: (venueId: string) => api.chat.startWithVenue(venueId),
    onSuccess: (thread) => navigate(`/account/messages/${thread.id}`),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isPending) return <VenueDetailSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} className="my-auto" />;

  const activeSport = sport ?? venue.sports[0] ?? "football";
  const fields = venue.fields.filter((f) => f.sport === activeSport);
  const selectedField = venue.fields.find((f) => f.id === viewField) ?? fields[0] ?? venue.fields[0];
  const name = text.name(venue);
  const todayHours = venue.openingHours.find((h) => h.weekday === weekdayOf(dates.today));
  const weekdayLabel = (weekday: number): string => dates.weekday(addDays("2026-11-15", weekday)); // 2026-11-15 is a Sunday

  return (
    <article className="pb-20 lg:pb-0">
      <Container className="max-lg:px-0 lg:pt-6">
        <div className="relative">
          <Gallery photos={venue.photos} name={name} morph={morph} />
          <FavoriteButton venueId={venue.id} isFavorite={venue.isFavorite} className="absolute top-3 right-3 z-10" />
        </div>
      </Container>

      <Container className="grid grid-cols-1 gap-x-10 gap-y-8 pt-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:pt-8">
        <div className="flex min-w-0 flex-col gap-9">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {venue.verified ? (
                <Badge variant="success">
                  <BadgeCheck />
                  {t("common.verified")}
                </Badge>
              ) : null}
              {venue.featured ? <Badge variant="accent">{t("common.featured")}</Badge> : null}
              {venue.status !== "approved" ? <Badge variant="warning">{t(`status.venue.${venue.status}`)}</Badge> : null}
              {venue.sports.map((s) => <SportBadge key={s} sport={s} />)}
            </div>
            <h1 className="font-display text-3xl text-balance sm:text-5xl">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.95rem]">
              <Rating value={venue.rating} count={venue.reviewCount} />
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-4" aria-hidden />
                {venue.district}, {t(`province.${venue.province}`)}
              </span>
              {todayHours && !todayHours.closed ? (
                <span className="font-num text-muted-foreground">
                  {t("venue.openToday", { open: todayHours.open, close: todayHours.close })}
                </span>
              ) : null}
            </div>
            <p className="max-w-3xl text-[1.05rem] text-pretty text-foreground/85">{text.description(venue)}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="secondary" size="sm" className="h-10" disabled={chat.isPending} onClick={() => (user ? chat.mutate(venue.id) : navigate(`/login?next=/venues/${slug}`))}>
                {chat.isPending ? <Spinner /> : <MessageCircle />}
                {t("venue.messageOwner")}
              </Button>
              <Button variant="secondary" size="sm" className="h-10" asChild>
                <a href={`tel:${venue.phone.replace(/\s/g, "")}`}>
                  <Phone />
                  {t("venue.call")}
                </a>
              </Button>
              {venue.sports.some(supportsMatching) ? (
                <Button variant="secondary" size="sm" className="h-10" asChild>
                  <Link href="/matches">
                    <Swords />
                    {t("venue.findOpponent")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </header>

          <section aria-labelledby="fields-title" className="flex flex-col gap-4">
            <h2 id="fields-title" className="font-display text-2xl">{t("venue.fields")}</h2>
            {venue.sports.length > 1 ? (
              <Tabs value={activeSport} onValueChange={(value) => { setSport(value as Sport); setViewField(null); }}>
                <TabsList className="w-full sm:w-fit">
                  {venue.sports.map((s) => (
                    <TabsTrigger key={s} value={s}>
                      {t(`sport.${s}`)}
                      <span className="font-num opacity-70">{venue.fields.filter((f) => f.sport === s).length}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : null}
            <ul className="flex flex-col gap-3">
              {fields.map((field) => (
                <FieldRow key={field.id} field={field} slug={venue.slug} selected={selectedField?.id === field.id} onView={() => { setViewField(field.id); viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
              ))}
            </ul>
          </section>

          {selectedField ? (
            <section aria-labelledby="viewer-title" className="flex flex-col gap-3" ref={viewerRef}>
              <div>
                <h2 id="viewer-title" className="font-display text-2xl">{t("venue.lookAround")}</h2>
                <p className="text-muted-foreground">
                  {selectedField.name} · {t(`surface.${selectedField.surface}`)} · {selectedField.format}
                </p>
              </div>
              <FieldViewer key={selectedField.id} field={selectedField} />
            </section>
          ) : null}

          <Reveal>
            <section aria-labelledby="amenities-title" className="flex flex-col gap-4">
              <h2 id="amenities-title" className="font-display text-2xl">{t("venue.amenities")}</h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {AMENITIES.filter((a) => venue.amenities.includes(a)).map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity];
                  return (
                    <li key={amenity} className="flex items-center gap-2.5 text-[0.95rem]">
                      <Icon className="size-5 shrink-0 text-primary" aria-hidden />
                      {t(`amenity.${amenity}`)}
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>

          <Reveal>
            <section aria-labelledby="hours-title" className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h2 id="hours-title" className="font-display text-2xl">{t("venue.hours")}</h2>
                <table className="w-full text-[0.95rem]">
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
                      const hours = venue.openingHours.find((h) => h.weekday === weekday);
                      const isToday = weekday === weekdayOf(dates.today);
                      return (
                        <tr key={weekday} className={cn(isToday && "font-bold text-primary")}>
                          <th scope="row" className="py-1.5 text-left font-[inherit]">{weekdayLabel(weekday)}</th>
                          <td className="font-num py-1.5 text-right">{hours && !hours.closed ? `${hours.open} – ${hours.close}` : t("venue.closed")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-sm text-muted-foreground">{t("venue.peakNote")}</p>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="font-display text-2xl">{t("venue.location")}</h2>
                <div className="relative isolate h-56 overflow-hidden rounded-2xl bg-muted">
                  <VenuesMap pins={[{ id: venue.id, lat: venue.lat, lng: venue.lng, label: name, title: name }]} interactive={false} />
                </div>
                <p className="text-[0.95rem]">{venue.address}, {venue.district}</p>
                <Button variant="secondary" asChild className="w-fit">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`} target="_blank" rel="noopener noreferrer">
                    <Navigation />
                    {t("venue.directions")}
                  </a>
                </Button>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <Reviews venueId={venue.id} rating={venue.rating} count={venue.reviewCount} />
          </Reveal>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>{t("venue.managedBy", { name: venue.owner.name })}</p>
            <Button variant="ghost" size="sm" className="h-10" onClick={() => (user ? setReportOpen(true) : navigate(`/login?next=/venues/${slug}`))}>
              <Flag />
              {t("venue.report")}
            </Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={t("venue.bookNow")}>
          <BookingCard venue={venue} sport={activeSport} date={date} onDate={setDate} />
        </aside>
      </Container>

      <StickyBar>
        <p className="min-w-0 flex-1 text-sm leading-tight">
          <span className="text-muted-foreground">{t("common.from")}</span>
          <br />
          <Price usd={venue.priceFromUsd} className="text-lg" /> <span className="text-muted-foreground">/{t("venues.hr")}</span>
        </p>
        <Button asChild size="lg" className="px-8">
          <Link href={`/book/${venue.slug}?sport=${activeSport}&date=${date}`}>{t("venue.bookNow")}</Link>
        </Button>
      </StickyBar>

      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} targetType="venue" targetId={venue.id} />
    </article>
  );
}
