import { useTranslations } from "next-intl";
import { KramaStrip } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";

/** A designed close: krama band, links, then the name at full width. */
export function SiteFooter() {
  const t = useTranslations();
  const year = 2026;
  return (
    <footer className="mt-16 overflow-hidden bg-foreground text-background lg:mt-24">
      <KramaStrip />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 lg:px-6 lg:py-14">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <p className="max-w-xs text-lg font-medium text-balance">{t("footer.blurb")}</p>
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 text-[0.95rem]">
            <nav aria-label={t("footer.company")} className="flex flex-col gap-1">
              <h2 className="mb-1 font-bold">{t("footer.company")}</h2>
              <Link className="py-1.5 opacity-80 hover:opacity-100" href="/terms">{t("footer.terms")}</Link>
              <Link className="py-1.5 opacity-80 hover:opacity-100" href="/privacy">{t("footer.privacy")}</Link>
              <Link className="py-1.5 opacity-80 hover:opacity-100" href="/credits">{t("footer.credits")}</Link>
            </nav>
          </div>
        </div>
        <p lang="en" aria-hidden className="font-display text-[15vw] leading-[0.8] tracking-[-0.05em] select-none lg:text-[13rem]">
          PitchKH
        </p>
        <div className="flex flex-col gap-1 text-sm opacity-75 sm:flex-row sm:justify-between">
          <p>{t("footer.rights", { year })}</p>
          <p className="font-num">{t("footer.rate")}</p>
        </div>
      </div>
    </footer>
  );
}
