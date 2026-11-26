import { formatUsd } from "@pitchkh/shared";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/components/common/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { BRANCHES, branchName, branchSports } from "@/lib/branches";

/** Home: the business's branches. One tap opens a branch's booking screen. */
export async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 lg:px-6 lg:pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl leading-[0.95] tracking-tight text-balance sm:text-5xl">{t("book.home.title")}</h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("book.home.subtitle")}</p>
        </div>
        <ol className="flex flex-col gap-2 rounded-2xl bg-card p-4 text-sm sm:flex-row sm:gap-6">
          {(["one", "two", "three"] as const).map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="font-num grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">{i + 1}</span>
              {t(`book.home.step.${step}`)}
            </li>
          ))}
        </ol>
        <h2 className="text-xl font-bold">{t("book.home.branches")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((branch, index) => {
            const from = Math.min(...branch.fields.map((f) => f.pricePerHourUsd));
            return (
              <li key={branch.slug}>
                <Link href={`/branch/${branch.slug}`} className="press group flex h-full flex-col overflow-hidden rounded-2xl bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring">
                  <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                    {branch.photos[0] ? (
                      <Image src={branch.photos[0]} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" priority={index === 0} />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg leading-tight font-bold">{branchName(branch, locale)}</h3>
                      <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" aria-hidden />
                      {branch.district}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-4 shrink-0" aria-hidden />
                      <span className="font-num">{branch.open}–{branch.close}</span>
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      {branchSports(branch).map((sport) => (
                        <Badge key={sport} variant={sport}>
                          {t(`sport.${sport}`)}
                        </Badge>
                      ))}
                      <span className="ml-auto text-sm text-muted-foreground">
                        {t("book.home.from", { price: formatUsd(from) })}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <SiteFooter />
    </>
  );
}
