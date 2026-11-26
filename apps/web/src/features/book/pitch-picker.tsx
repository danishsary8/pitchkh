"use client";

import { formatUsd, type Field, type Sport } from "@pitchkh/shared";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { SportIcon } from "@/components/brand/pitch-art";
import { PitchLegend, PitchMap } from "@/features/pitch-map/pitch-map";
import type { PitchAvailability } from "@/lib/availability";
import { priceFor } from "@/lib/booking-rules";
import { type Branch, branchName, branchSports } from "@/lib/branches";
import { cn } from "@/lib/utils";
import { ScrollRow, Segmented, StepHeading } from "./controls";

interface PitchPickerProps {
  branch: Branch;
  sport: Sport | null;
  onSport: (sport: Sport | null) => void;
  states: Record<string, PitchAvailability>;
  value: string | null;
  onChange: (fieldId: string) => void;
  start: number | null;
  duration: number;
  done: boolean;
}

/**
 * Step 3: the site plan for the big picture, and the same pitches as a list
 * underneath for an easy tap on a phone. Both share one selection.
 */
export function PitchPicker({ branch, sport, onSport, states, value, onChange, start, duration, done }: PitchPickerProps) {
  const t = useTranslations();
  const locale = useLocale();
  const shown = branch.fields.filter((f) => !sport || f.sport === sport);
  const list = useRef<HTMLDivElement>(null);
  // A pitch picked on the map slides its card into view in the list below.
  useEffect(() => {
    if (!value) return;
    const card = list.current?.querySelector<HTMLElement>(`[data-option="${value}"]`);
    card?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "center" });
  }, [value]);
  return (
    <section aria-labelledby="pick-pitch" className="flex flex-col gap-3">
      <StepHeading
        id="pick-pitch"
        n={3}
        done={done}
        aside={
          <Segmented
            label={t("book.branch.sport")}
            value={sport}
            onChange={onSport}
            options={[{ value: null, label: t("common.all") }, ...branchSports(branch).map((s) => ({ value: s, label: t(`sport.${s}`) }))]}
          />
        }
      >
        {t("book.branch.pitch")}
      </StepHeading>
      <PitchMap
        className="-mx-4 w-[calc(100%+2rem)] rounded-none sm:mx-0 sm:w-full sm:rounded-3xl"
        fields={branch.fields}
        states={states}
        sport={sport}
        selectedId={value}
        onSelect={onChange}
        label={t("pitchMap.label", { name: branchName(branch, locale) })}
      />
      <PitchLegend />
      <ScrollRow ref={list} className="lg:grid lg:grid-cols-4 lg:gap-2">
        {shown.map((field) => (
          <PitchOption key={field.id} field={field} state={states[field.id] ?? "free"} selected={field.id === value} onSelect={() => onChange(field.id)} start={start} duration={duration} />
        ))}
      </ScrollRow>
    </section>
  );
}

function PitchOption({ field, state, selected, onSelect, start, duration }: { field: Field; state: PitchAvailability; selected: boolean; onSelect: () => void; start: number | null; duration: number }) {
  const t = useTranslations();
  const full = state === "full";
  const price = start !== null ? formatUsd(priceFor(field, start, start + duration)) : t("book.home.from", { price: formatUsd(field.pricePerHourUsd) });
  return (
    <button
      type="button"
      data-option={field.id}
      aria-pressed={selected}
      disabled={full}
      onClick={onSelect}
      className={cn(
        "press flex w-44 shrink-0 flex-col gap-2 rounded-2xl bg-card p-3 text-left ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 lg:w-auto",
        selected ? "ring-2 ring-primary" : "ring-border hover:ring-foreground/25",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-secondary" style={{ color: `var(--sport-${field.sport})` }}>
          <SportIcon sport={field.sport} className="size-4.5" />
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-bold", full ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary")}>
          {full ? t("pitchMap.state.full") : t("pitchMap.state.free")}
        </span>
      </span>
      <span className="flex flex-col">
        <span className="font-bold">{field.name}</span>
        <span className="text-xs text-muted-foreground">
          <span className="font-num">{field.format}</span>, {field.indoor ? t("common.indoor") : t("common.outdoor")}
        </span>
      </span>
      <span className="font-num text-sm font-semibold">{price}</span>
    </button>
  );
}
