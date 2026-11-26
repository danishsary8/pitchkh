"use client";

import type { Field } from "@pitchkh/shared";
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Price } from "@/components/common/price";
import { Button } from "@/components/ui/button";
import type { NextStep } from "@/lib/availability";
import { hhmm, priceFor } from "@/lib/booking-rules";
import { type Branch, branchName } from "@/lib/branches";
import { useDates } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SummaryProps {
  branch: Branch;
  field: Field | null;
  date: string;
  start: number | null;
  duration: number;
  hint: NextStep;
  onContinue: () => void;
}

const priceOf = ({ field, start, duration }: Pick<SummaryProps, "field" | "start" | "duration">): number | null => (field && start !== null ? priceFor(field, start, start + duration) : null);

/** Desktop: a sticky "Your booking" card beside the steps that fills in as the customer picks. */
export function SummaryPanel(props: SummaryProps) {
  const { branch, field, date, start, duration, hint, onContinue } = props;
  const t = useTranslations();
  const locale = useLocale();
  const dates = useDates();
  const price = priceOf(props);
  return (
    <aside aria-labelledby="summary-title" className="sticky top-[calc(var(--header-h)+1.5rem)] hidden flex-col gap-5 rounded-3xl bg-card p-5 ring-1 ring-border lg:flex">
      <h2 id="summary-title" className="text-lg font-bold tracking-tight">{t("book.summary.title")}</h2>
      <dl className="flex flex-col gap-4">
        <Row icon={<MapPin />} label={t("book.summary.where")}>
          {branchName(branch, locale)}
          {field ? <span className="block font-normal text-muted-foreground">{field.name}, <span className="font-num">{field.format}</span></span> : null}
        </Row>
        <Row icon={<CalendarDays />} label={t("book.summary.day")}>{dates.dayLong(date)}</Row>
        <Row icon={<Clock />} label={t("book.summary.time")}>
          {start !== null ? <span className="font-num">{hhmm(start)}–{hhmm(start + duration)}</span> : <span className="font-normal text-muted-foreground">{t("book.summary.notChosen")}</span>}
        </Row>
      </dl>
      <div className="flex items-end justify-between border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">{t("book.form.total")}</span>
        {price !== null ? <Price usd={price} className="text-2xl" animated /> : <span className="text-muted-foreground">—</span>}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t("book.done.payAtVenue")}</p>
      <ContinueButton hint={hint} onContinue={onContinue} />
    </aside>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4.5">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-semibold">{children}</dd>
      </div>
    </div>
  );
}

/** Phones and tablets: a bar fixed to the bottom with the pick, the price and Continue. */
export function SummaryBar(props: SummaryProps) {
  const { field, start, duration, hint, onContinue } = props;
  const t = useTranslations();
  const price = priceOf(props);
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 bg-card/95 shadow-[0_-1px_0_var(--border),0_-12px_32px_rgb(12_31_26/0.08)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3" aria-live="polite">
        <div className="min-w-0 flex-1">
          {field && start !== null ? (
            <>
              <p className="truncate text-sm font-bold">
                {field.name} <span className="font-num font-medium text-muted-foreground">{hhmm(start)}–{hhmm(start + duration)}</span>
              </p>
              {price !== null ? <Price usd={price} className="text-lg" animated /> : null}
            </>
          ) : (
            <p className="text-sm font-medium text-pretty text-muted-foreground">{hint ? t(`book.branch.${hint}`) : null}</p>
          )}
        </div>
        <ContinueButton hint={hint} onContinue={onContinue} className="shrink-0" />
      </div>
    </div>
  );
}

function ContinueButton({ hint, onContinue, className }: { hint: NextStep; onContinue: () => void; className?: string }) {
  const t = useTranslations();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button size="lg" disabled={hint !== null} onClick={onContinue}>
        {t("book.branch.continue")}
        <ArrowRight />
      </Button>
      {hint ? <p className="hidden text-center text-xs text-muted-foreground lg:block">{t(`book.branch.${hint}`)}</p> : null}
    </div>
  );
}
