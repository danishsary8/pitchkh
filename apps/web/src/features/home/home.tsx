import { SPORTS, type Sport } from "@pitchkh/shared";
import { ArrowRight, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { KramaStrip, PitchLines } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";
import { Container, SectionHeading } from "@/components/common/page";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { FeaturedVenues, FreeTonight, HowItWorksMap, OpenMatches, SearchCard } from "./home-islands";
import { NextGame, PlayAgain } from "./my-games";
import { features } from "@/lib/features";

/*
 * Home is a server component: the hero, sport tiles, steps and footer render
 * to HTML on the server and need no client JavaScript. Only the search card,
 * the "how it works" pitch map and the live data blocks are client islands.
 */

const SPORT_COPY: Record<Sport, "sportFootball" | "sportVolleyball" | "sportTennis"> = { football: "sportFootball", volleyball: "sportVolleyball", tennis: "sportTennis" };

export function HomePage() {
  const t = useTranslations();
  const steps = [
    { title: t("home.step1Title"), body: t("home.step1Body") },
    { title: t("home.step2Title"), body: t("home.step2Body") },
    { title: t("home.step3Title"), body: t("home.step3Body") },
  ];

  return (
    <>
      {/* Hero: a floodlit pitch at dusk fills the frame, chalk lines over it, the search on the right. */}
      <section className="relative isolate overflow-hidden bg-pitch text-pitch-foreground">
        <Image src="/assets/brand/hero.webp" alt={t("home.heroImageAlt")} fill priority sizes="100vw" className="-z-20 object-cover object-[60%_40%]" />
        <span className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(4,32,20,0.92)_0%,rgba(4,32,20,0.78)_38%,rgba(4,32,20,0.35)_70%,rgba(4,32,20,0.55)_100%)]" aria-hidden />
        <PitchLines className="absolute inset-0 -z-10 size-full text-white/12" />
        <Container className="grid grid-cols-1 items-end gap-8 pt-10 pb-10 lg:min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-14 lg:pt-20 lg:pb-16">
          <div className="flex flex-col gap-4 lg:gap-6 lg:pb-2">
            <NextGame />
            <h1 className="font-display max-w-[14ch] text-[2.65rem] leading-[0.95] text-balance min-[400px]:text-5xl md:text-6xl xl:text-7xl">{t("home.heroTitle")}</h1>
            <p className="max-w-[46ch] text-lg text-pretty text-white/90 lg:text-xl">{t("home.heroBody")}</p>
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
            {SPORTS.map((sport) => (
              <li key={sport}>
                  <Link href={`/venues?sport=${sport}`} className="group relative flex aspect-[16/9] items-end overflow-hidden rounded-3xl bg-pitch outline-none focus-visible:ring-3 focus-visible:ring-ring md:aspect-[4/5]">
                    <Image src={`/assets/brand/sport-${sport}.webp`} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
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

        {/* How it works, shown on a real venue: the pitch map is what makes PitchKH different. */}
        <section aria-labelledby="how-title" className="grid gap-6 lg:grid-cols-[1fr_1.25fr] lg:gap-x-16">
          <div className="flex flex-col gap-3">
            <h2 id="how-title" className="font-display text-3xl text-balance sm:text-4xl">{t("home.howTitle")}</h2>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("home.howBody")}</p>
          </div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <HowItWorksMap />
          </div>
          <ol className="flex flex-col gap-5">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span aria-hidden className="font-num grid size-9 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground">{i + 1}</span>
                <div className="flex flex-col gap-0.5 pt-1">
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="max-w-md text-pretty text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {features.matches ? <section aria-labelledby="matches-title" className="-mx-4 bg-foreground px-4 py-10 text-background lg:mx-0 lg:rounded-[2rem] lg:px-10 lg:py-14">
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
        </section> : null}
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

