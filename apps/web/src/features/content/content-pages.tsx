import { useTranslations } from "next-intl";
import { Container, PageHeader } from "@/components/common/page";
import { SiteFooter } from "@/components/layout/site-footer";

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const t = useTranslations(`legal.${kind}`);
  const tl = useTranslations("legal");
  const sections = ["s1", "s2", "s3", "s4", "s5"] as const;
  return (
    <>
      <Container size="md">
        <PageHeader title={t("title")} subtitle={tl("updated")} />
        <div className="flex flex-col gap-7 text-[1.05rem]">
          <p className="rounded-2xl bg-warning-surface p-4 text-[0.95rem] text-pretty">{tl("demoNotice")}</p>
          {sections.map((s) => (
            <section key={s} className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">{t(`${s}.title`)}</h2>
              <p className="text-pretty text-foreground/85">{t(`${s}.body`)}</p>
            </section>
          ))}
        </div>
      </Container>
      <SiteFooter />
    </>
  );
}

interface PhotoCredit { title: string; creator: string | null; license: string; licenseUrl: string | null; source: string; files: string[] }

/** Sample photos are freely licensed (CC BY, CC BY-SA, CC0); this page gives each photographer credit. */
export function CreditsPage({ credits }: { credits: PhotoCredit[] }) {
  const t = useTranslations("credits");
  return (
    <>
      <Container size="md">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <ul className="flex flex-col gap-3 pb-8">
          {credits.map((c) => (
            <li key={c.source} className="rounded-2xl bg-card p-4 text-[0.95rem]">
              <a href={c.source} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">{c.title || t("untitled")}</a>
              <p className="text-muted-foreground">
                {c.creator ? t("by", { name: c.creator }) : null}
                {c.creator ? " · " : null}
                {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{c.license}</a> : c.license}
                {" · "}
                {t("usedFor", { count: c.files.length })}
              </p>
            </li>
          ))}
        </ul>
      </Container>
      <SiteFooter />
    </>
  );
}
