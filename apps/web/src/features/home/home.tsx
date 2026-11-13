"use client";

import { addDays, PROVINCES, SPORTS, timeInPP, type Province, type Sport } from "@pitchkh/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Clock, Languages, QrCode, Search, Undo2 } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { KramaStrip, PitchLines, SportIcon } from "@/components/brand/pitch-art";
import { Link, useNavigate } from "@/components/common/link";
import { Reveal } from "@/components/common/motion";
import { Container, SectionHeading } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/components/layout/site-footer";
import { MatchCard, MatchCardSkeleton } from "@/features/matches/match-card";
import { useVenueText } from "@/features/venues/text";
import { VenueCard, VenueCardSkeleton } from "@/features/venues/venue-card";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { useIsClient } from "@/lib/hooks";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

function SearchCard() {
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
function FreeTonight() {
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

const SPORT_COPY: Record<Sport, "sportFootball" | "sportVolleyball" | "sportTennis"> = { football: "sportFootball", volleyball: "sportVolleyball", tennis: "sportTennis" };

export function HomePage() {
  const t = useTranslations();
  const featured = useQuery({ queryKey: qk.venues({ featured: true, pageSize: 6 }), queryFn: () => api.venues.list({ featured: true, pageSize: 6 }) });
  const matches = useQuery({ queryKey: qk.matches({ pageSize: 3 }), queryFn: () => api.matches.list({ pageSize: 3 }) });
  const steps = [
    { title: t("home.step1Title"), body: t("home.step1Body") },
    { title: t("home.step2Title"), body: t("home.step2Body") },
    { title: t("home.step3Title"), body: t("home.step3Body") },
  ];
  const trust = [
    { icon: BadgeCheck, title: t("home.trustVerifiedTitle"), body: t("home.trustVerifiedBody") },
    { icon: QrCode, title: t("home.trustPayTitle"), body: t("home.trustPayBody") },
    { icon: Undo2, title: t("home.trustCancelTitle"), body: t("home.trustCancelBody") },
    { icon: Languages, title: t("home.trustLanguageTitle"), body: t("home.trustLanguageBody") },
  ];

  return (
    <>
      {/* Hero: the pitch itself is the page. Mown stripes, chalk lines, and the search on the centre spot. */}
      <section className="pitch-stripes relative isolate overflow-hidden text-pitch-foreground">
        <PitchLines className="absolute inset-0 -z-10 size-full text-white/25" />
        <Container className="grid items-center gap-8 pt-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-14 lg:pt-16 lg:pb-20">
          <div className="flex flex-col gap-4 lg:gap-6">
            <h1 className="font-display text-[2.65rem] text-balance min-[400px]:text-5xl md:text-6xl xl:text-7xl">{t("home.heroTitle")}</h1>
            <p className="max-w-xl text-lg text-pretty text-white/90 lg:text-xl">{t("home.heroBody")}</p>
            <div className="relative mt-2 hidden aspect-[16/9] overflow-hidden rounded-3xl lg:block">
              <Image src="/assets/brand/hero.webp" alt={t("home.heroImageAlt")} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
          <SearchCard />
        </Container>
        <KramaStrip />
      </section>

      <Container className="flex flex-col gap-14 pt-6 lg:gap-24 lg:pt-10">
        <FreeTonight />

        <section aria-labelledby="sports-title" className="flex flex-col gap-5">
          <SectionHeading title={t("home.sportsTitle")} className="[&>h2]:max-w-xl" />
          <h2 id="sports-title" className="sr-only">{t("home.sportsTitle")}</h2>
          <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
            {SPORTS.map((sport, i) => (
              <li key={sport}>
                <Reveal delay={i * 0.06}>
                  <Link href={`/venues?sport=${sport}`} className="group relative flex aspect-[16/9] items-end overflow-hidden rounded-3xl bg-pitch outline-none focus-visible:ring-3 focus-visible:ring-ring md:aspect-[4/5]">
                    <Image src={`/assets/brand/sport-${sport}.webp`} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/75 to-transparent" aria-hidden />
                    <span className="relative flex w-full items-end justify-between gap-3 p-5 text-white">
                      <span>
                        <span className="font-display block text-3xl">{t(`sport.${sport}`)}</span>
                        <span className="mt-1 block text-sm text-white/85">{t(`home.${SPORT_COPY[sport]}`)}</span>
                      </span>
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black transition-transform duration-200 ease-out motion-safe:group-hover:translate-x-1">
                        <ArrowRight className="size-5" />
                      </span>
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="featured-title" className="flex flex-col gap-5">
          <SectionHeading
            title={t("home.featuredTitle")}
            action={
              <Button asChild variant="ghost" size="sm" className="h-10 shrink-0">
                <Link href="/venues">
                  {t("common.viewAll")}
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
          <span id="featured-title" className="sr-only">{t("home.featuredTitle")}</span>
          {featured.isError ? null : (
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
              {featured.isPending
                ? [0, 1, 2].map((i) => <div key={i} className="w-[82vw] max-w-sm shrink-0 md:w-auto md:max-w-none"><VenueCardSkeleton /></div>)
                : featured.data.data.map((venue) => (
                    <div key={venue.id} className="w-[82vw] max-w-sm shrink-0 snap-center md:w-auto md:max-w-none">
                      <VenueCard venue={venue} className="h-full" />
                    </div>
                  ))}
            </div>
          )}
        </section>

        <section aria-labelledby="how-title" className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="flex flex-col gap-3">
            <h2 id="how-title" className="font-display text-3xl text-balance sm:text-4xl">{t("home.howTitle")}</h2>
            <p className="text-lg text-pretty text-muted-foreground">{t("home.howBody")}</p>
          </div>
          <ol className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={i * 0.07} className={cn("flex flex-col gap-1 rounded-3xl p-5 sm:p-6", i === 2 ? "bg-primary text-primary-foreground" : "bg-card")}>
                  <h3 className="font-display text-xl sm:text-2xl">{step.title}</h3>
                  <p className={cn("text-pretty", i === 2 ? "text-primary-foreground/90" : "text-muted-foreground")}>{step.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="matches-title" className="-mx-4 bg-foreground px-4 py-10 text-background lg:mx-0 lg:rounded-[2rem] lg:px-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-14">
            <div className="flex flex-col items-start gap-4">
              <h2 id="matches-title" className="font-display text-3xl text-balance sm:text-4xl">{t("home.matchTitle")}</h2>
              <p className="text-lg text-pretty opacity-85">{t("home.matchBody")}</p>
              <Button asChild variant="accent" size="lg">
                <Link href="/matches">{t("home.matchCta")}</Link>
              </Button>
            </div>
            <div className="flex flex-col gap-3 text-foreground">
              {matches.isPending ? [0, 1].map((i) => <MatchCardSkeleton key={i} />) : matches.data?.data.map((match) => <MatchCard key={match.id} match={match} compact />)}
            </div>
          </div>
        </section>

        <section aria-labelledby="trust-title" className="flex flex-col gap-6">
          <h2 id="trust-title" className="font-display max-w-2xl text-3xl text-balance sm:text-4xl">{t("home.trustTitle")}</h2>
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((item, i) => (
              <li key={item.title}>
                <Reveal delay={i * 0.05} className="flex gap-3 lg:flex-col">
                  <item.icon className="size-7 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-[0.95rem] text-pretty text-muted-foreground">{item.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="owner-title" className="pitch-stripes relative isolate overflow-hidden rounded-[2rem] p-6 text-pitch-foreground sm:p-10">
          <PitchLines sport="tennis" className="absolute inset-0 -z-10 size-full text-white/20" />
          <div className="flex max-w-xl flex-col items-start gap-4">
            <h2 id="owner-title" className="font-display text-3xl text-balance sm:text-4xl">{t("home.ownerTitle")}</h2>
            <p className="text-lg text-pretty text-white/90">{t("home.ownerBody")}</p>
            <Button asChild variant="inverse" size="lg">
              <Link href="/login?next=/owner">
                <Clock />
                {t("home.ownerCta")}
              </Link>
            </Button>
          </div>
        </section>
      </Container>
      <SiteFooter />
    </>
  );
}

