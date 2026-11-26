import { formatUsd } from "@pitchkh/shared";
import { Clock, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { KramaStrip, SportIcon } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { BRANCHES, branchName, branchSports } from "@/lib/branches";
import { OpenBadge } from "./open-badge";

/**
 * Home: a floodlit pitch at dusk (when most games are played) with the promise
 * over it, then the branches. One tap on a branch opens its booking screen.
 */
export async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <>
      <section aria-labelledby="home-title" className="relative isolate overflow-hidden bg-[#0c1f1a] text-white">
        <Image src="/assets/brand/hero.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[50%_60%] opacity-90" />
        {/* Night sky stays dark enough for white type; the grass shows through at the bottom. */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_18_14/0.55)_0%,rgb(7_18_14/0.25)_45%,rgb(7_18_14/0.88)_100%)]" />
        <div className="mx-auto flex min-h-[min(60svh,26rem)] w-full max-w-6xl flex-col justify-end gap-4 px-4 pt-14 pb-6 sm:min-h-[min(78svh,40rem)] sm:gap-6 sm:pb-8 lg:px-6 lg:pb-12">
          <h1 id="home-title" className="font-display max-w-3xl text-[clamp(2.5rem,10.5vw,6.5rem)] text-balance drop-shadow-[0_2px_24px_rgb(0_0_0/0.35)]">
            {t("book.home.title")}
          </h1>
          <p className="max-w-xl text-base text-pretty text-white/85 sm:text-xl">{t("book.home.subtitle")}</p>
          <ol className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0 sm:text-[0.95rem]">
            {(["one", "two", "three"] as const).map((step, i) => (
              <li key={step} className="flex shrink-0 items-center gap-2 rounded-full bg-white/12 py-1.5 pr-3.5 pl-1.5 backdrop-blur-md">
                <span className="font-num grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground sm:size-7 sm:text-sm">{i + 1}</span>
                {t(`book.home.step.${step}`)}
              </li>
            ))}
          </ol>
        </div>
      </section>
      <KramaStrip />

      <section aria-labelledby="branches-title" className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-8 lg:px-6 lg:pt-12">
        <h2 id="branches-title" className="text-2xl font-bold tracking-tight">{t("book.home.branches")}</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((branch, index) => {
            const from = Math.min(...branch.fields.map((f) => f.pricePerHourUsd));
            return (
              <li key={branch.slug}>
                <Link
                  href={`/branch/${branch.slug}`}
                  className="press group flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_0_var(--border)] outline-none focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#0c1f1a]">
                    {branch.photos[0] ? (
                      <Image
                        src={branch.photos[0]}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                        priority={index === 0}
                      />
                    ) : null}
                    <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(7_18_14/0.85)_100%)]" />
                    <OpenBadge branch={branch} className="absolute top-3 left-3" />
                    <h3 className="font-display absolute inset-x-4 bottom-4 text-[1.7rem] text-white">{branchName(branch, locale)}</h3>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="size-4 shrink-0" aria-hidden />
                        {branch.district}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="size-4 shrink-0" aria-hidden />
                        <span className="font-num">{branch.open}–{branch.close}</span>
                      </p>
                    </div>
                    <div className="mt-auto flex items-center gap-3 border-t border-border pt-3">
                      <ul className="flex gap-1.5" aria-label={t("book.branch.sport")}>
                        {branchSports(branch).map((sport) => (
                          <li key={sport} title={t(`sport.${sport}`)} className="grid size-8 place-items-center rounded-full bg-secondary" style={{ color: `var(--sport-${sport})` }}>
                            <SportIcon sport={sport} className="size-4.5" />
                            <span className="sr-only">{t(`sport.${sport}`)}</span>
                          </li>
                        ))}
                      </ul>
                      <span className="ml-auto text-sm text-muted-foreground">{t("book.home.from", { price: formatUsd(from) })}</span>
                      <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
                        {t("book.home.book")}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <SiteFooter />
    </>
  );
}
