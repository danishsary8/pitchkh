import { SPORTS, type Sport } from "@pitchkh/shared";
import { ArrowRight, BadgeCheck, Clock, Languages, QrCode, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { KramaStrip, PitchLines } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";
import { Reveal } from "@/components/common/motion";
import { Container, SectionHeading } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { cn } from "@/lib/utils";
import { FeaturedVenues, FreeTonight, OpenMatches, SearchCard } from "./home-islands";
import { NextGame, PlayAgain } from "./my-games";
import { RotatingWord } from "./rotating-word";

/*
 * Home is a server component: the hero, sport tiles, steps, trust list and
 * footer render to HTML on the server and need no client JavaScript. Only the
 * search card and the three live data blocks are client islands.
 */

const SPORT_COPY: Record<Sport, "sportFootball" | "sportVolleyball" | "sportTennis"> = { football: "sportFootball", volleyball: "sportVolleyball", tennis: "sportTennis" };

export function HomePage() {
  const t = useTranslations();
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
        <Container className="grid grid-cols-1 items-center gap-8 pt-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-14 lg:pt-16 lg:pb-20">
          <div className="flex flex-col gap-4 lg:gap-6">
            <NextGame />
            <h1 className="font-display text-[2.65rem] text-balance min-[400px]:text-5xl md:text-6xl xl:text-7xl">{t("home.heroLead")} <RotatingWord words={t("home.heroWords").split("|")} suffix={t("home.heroEnd")} /></h1>
            <p className="max-w-xl text-lg text-pretty text-white/90 lg:text-xl">{t("home.heroBody")}</p>
            <div className="relative mt-2 hidden aspect-[16/9] overflow-hidden rounded-3xl lg:block">
              <Image src="/assets/brand/hero.webp" alt={t("home.heroImageAlt")} fill loading="lazy" sizes="(min-width: 1024px) 50vw, 1px" className="object-cover" />
            </div>
          </div>
          <SearchCard />
        </Container>
        <KramaStrip />
      </section>

      <Container className="flex flex-col gap-14 pt-6 lg:gap-24 lg:pt-10">
        <PlayAgain />
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
          <FeaturedVenues />
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
            <OpenMatches />
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

