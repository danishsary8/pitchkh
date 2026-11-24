"use client";

import { APP, defaultTeamSize, formatUsd, SKILL_LEVELS, supportsMatching, type Field, type SkillLevel, type VenueDetail } from "@pitchkh/shared";
import { Minus, Plus, Swords, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field as FormField, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { Alert, Switch } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { BookingDraft } from "./draft-store";
import { PaymentMethodPicker } from "./payment";
import { features } from "@/lib/features";

type Update = (patch: Partial<BookingDraft>) => void;

function Counter({ value, onChange, min, max, label }: { value: number; onChange: (value: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <Button variant="secondary" size="icon" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} −`}>
        <Minus />
      </Button>
      <output className="font-num w-10 text-center text-lg font-bold" aria-live="polite">{value}</output>
      <Button variant="secondary" size="icon" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} +`}>
        <Plus />
      </Button>
    </div>
  );
}

function Row({ title, hint, children, htmlFor }: { title: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="font-semibold text-foreground">{title}</label>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Screen 2 of 2: opponent, players and extras (folded), payment. */
export function StepConfirm({ field, draft, update, summary }: { venue: VenueDetail; field: Field; draft: BookingDraft; update: Update; summary: React.ReactNode }) {
  const t = useTranslations();
  const teamSize = draft.teamSize ?? defaultTeamSize(field.format, field.sport);
  // "Find me an opponent" posts to the match board, which arrives with matches in v1.1.
  const matching = features.matches && supportsMatching(field.sport);
  const extras = [t("booking.playersShort", { count: teamSize })];
  if (draft.referee && field.sport !== "tennis") extras.push(t("booking.referee"));
  if (draft.extras.waterBottles) extras.push(`${draft.extras.waterBottles} × ${t("booking.water")}`);
  if (draft.extras.ball) extras.push(t("booking.ball"));
  if (draft.extras.bibs && field.sport === "football") extras.push(t("booking.bibs"));

  return (
    <div className="flex flex-col gap-6">
      <div className="lg:hidden">{summary}</div>

      {matching ? (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 font-bold">{t("booking.opponentQuestion")}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
            {(["have", "find"] as const).map((mode) => {
              const checked = draft.opponentMode === mode;
              const Icon = mode === "have" ? Users : Swords;
              return (
                <button key={mode} type="button" role="radio" aria-checked={checked} onClick={() => update({ opponentMode: mode })} className={cn("press flex items-start gap-3 rounded-2xl border-2 bg-card p-4 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring", checked ? "border-primary" : "border-transparent")}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", checked ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{t(`booking.opponent.${mode}.title`)}</span>
                    <span className="block text-sm text-muted-foreground">{t(`booking.opponent.${mode}.body`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {draft.opponentMode === "find" ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
                <FormField className="rounded-2xl bg-card p-4">
                  <FieldLabel htmlFor="match-level">{t("booking.teamLevel")}</FieldLabel>
                  <Select id="match-level" value={draft.matchLevel} onChange={(e) => update({ matchLevel: e.target.value as SkillLevel })}>
                    {SKILL_LEVELS.map((level) => <option key={level} value={level}>{t(`level.${level}`)}</option>)}
                  </Select>
                  <FieldDescription>{t("booking.teamLevelHint")}</FieldDescription>
                </FormField>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </fieldset>
      ) : null}

      <Accordion type="single" collapsible>
        <AccordionItem value="extras">
          <AccordionTrigger>
            <span className="flex min-w-0 flex-col">
              <span>{t("booking.extrasTitle")}</span>
              <span className="truncate text-sm font-normal text-muted-foreground">{extras.join(" · ")}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Row title={t("booking.teamSize")} hint={t("booking.teamSizeHint", { max: field.maxPlayers })}>
              <Counter value={teamSize} min={1} max={field.maxPlayers} onChange={(v) => update({ teamSize: v })} label={t("booking.teamSize")} />
            </Row>
            {field.sport !== "tennis" ? (
              <Row title={t("booking.referee")} hint={t("booking.refereeHint", { price: `$${APP.refereeUsdPerHour}` })} htmlFor="referee">
                <Switch id="referee" checked={draft.referee} onCheckedChange={(referee) => update({ referee })} />
              </Row>
            ) : null}
            <Row title={t("booking.water")} hint={t("booking.waterHint", { price: formatUsd(APP.waterBottleUsd) })}>
              <Counter value={draft.extras.waterBottles} min={0} max={48} onChange={(waterBottles) => update({ extras: { ...draft.extras, waterBottles } })} label={t("booking.water")} />
            </Row>
            <Row title={t("booking.ball")} hint={t("booking.ballHint", { price: `$${APP.ballRentalUsd}` })} htmlFor="ball">
              <Switch id="ball" checked={draft.extras.ball} onCheckedChange={(ball) => update({ extras: { ...draft.extras, ball } })} />
            </Row>
            {field.sport === "football" ? (
              <Row title={t("booking.bibs")} hint={t("booking.bibsHint", { price: `$${APP.bibsRentalUsd}` })} htmlFor="bibs">
                <Switch id="bibs" checked={draft.extras.bibs} onCheckedChange={(bibs) => update({ extras: { ...draft.extras, bibs } })} />
              </Row>
            ) : null}
            <FormField className="pt-3">
              <FieldLabel htmlFor="notes">{t("booking.notes")}</FieldLabel>
              <Textarea id="notes" value={draft.notes} maxLength={500} onChange={(e) => update({ notes: e.target.value })} placeholder={t("booking.notesPlaceholder")} />
            </FormField>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <section className="flex flex-col gap-3" aria-labelledby="pay-label">
        <h2 id="pay-label" className="font-bold">{t("booking.paymentMethod")}</h2>
        <PaymentMethodPicker value={draft.paymentMethod} onChange={(paymentMethod) => update({ paymentMethod })} />
      </section>
      {draft.paymentMethod === "cash" ? <Alert variant="warning" title={t("booking.cashTitle")}>{t("booking.cashBody")}</Alert> : null}
      {draft.opponentMode === "find" && matching ? <Alert variant="info" icon={<Swords />} title={t("booking.findTitle")}>{t("booking.findBody")}</Alert> : null}
      <p className="text-sm text-muted-foreground">{t("venue.freeCancel")}. {t("booking.demoNote")}</p>
    </div>
  );
}
