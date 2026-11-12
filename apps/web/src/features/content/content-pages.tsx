import { useTranslations } from "next-intl";
import { Container, PageHeader } from "@/components/common/page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteFooter } from "@/components/layout/site-footer";

const FAQ_GROUPS = { booking: ["q1", "q2", "q3", "q4"], payment: ["q1", "q2", "q3"], matches: ["q1", "q2", "q3"], owners: ["q1", "q2"] } as const;

export function HelpPage() {
  const t = useTranslations("help");
  return (
    <>
      <Container size="md">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <div className="flex flex-col gap-8">
          {(Object.keys(FAQ_GROUPS) as (keyof typeof FAQ_GROUPS)[]).map((group) => (
            <section key={group} aria-labelledby={`faq-${group}`} className="flex flex-col gap-3">
              <h2 id={`faq-${group}`} className="font-display text-xl">{t(`${group}.title`)}</h2>
              <Accordion type="single" collapsible className="flex flex-col gap-2">
                {FAQ_GROUPS[group].map((q) => (
                  <AccordionItem key={q} value={`${group}-${q}`}>
                    <AccordionTrigger>{t(`${group}.${q}.q` as "booking.q1.q")}</AccordionTrigger>
                    <AccordionContent>{t(`${group}.${q}.a` as "booking.q1.a")}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
          <p className="rounded-2xl bg-secondary p-4 text-pretty">{t("contact")}</p>
        </div>
      </Container>
      <SiteFooter />
    </>
  );
}

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
