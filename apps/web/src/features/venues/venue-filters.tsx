"use client";

import { addDays, DISTRICTS, PROVINCES, SPORTS, type Province, type Sport } from "@pitchkh/shared";
import { useTranslations } from "next-intl";
import { SportIcon } from "@/components/brand/pitch-art";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDates } from "@/lib/format";
import type { VenueFilters } from "./use-venue-filters";

const START_TIMES = ["06:00", "07:00", "08:00", "09:00", "10:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const PRICE_CAPS = [10, 15, 25, 40];

/** The filter controls. Rendered in the desktop sidebar and inside the mobile bottom sheet. */
export function VenueFilterFields({ filters, onChange, idPrefix }: { filters: VenueFilters; onChange: (patch: Partial<VenueFilters>) => void; idPrefix: string }) {
  const t = useTranslations();
  const dates = useDates();
  const days = Array.from({ length: 14 }, (_, i) => addDays(dates.today, i));

  return (
    <FieldGroup>
      <Field>
        <FieldLabel id={`${idPrefix}-sport`}>{t("venues.filterSport")}</FieldLabel>
        <ToggleGroup type="single" value={filters.sport ?? "all"} onValueChange={(v) => v && onChange({ sport: v === "all" ? null : (v as Sport) })} aria-labelledby={`${idPrefix}-sport`}>
          <ToggleGroupItem value="all">{t("common.all")}</ToggleGroupItem>
          {SPORTS.map((sport) => (
            <ToggleGroupItem key={sport} value={sport}>
              <SportIcon sport={sport} />
              {t(`sport.${sport}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-province`}>{t("venues.filterProvince")}</FieldLabel>
        <Select id={`${idPrefix}-province`} value={filters.province ?? ""} onChange={(e) => onChange({ province: (e.target.value || null) as Province | null })}>
          <option value="">{t("province.all")}</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{t(`province.${p}`)}</option>
          ))}
        </Select>
      </Field>

      {filters.province ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-district`}>{t("venues.filterDistrict")}</FieldLabel>
          <Select id={`${idPrefix}-district`} value={filters.district ?? ""} onChange={(e) => onChange({ district: e.target.value || null })}>
            <option value="">{t("venues.allDistricts")}</option>
            {DISTRICTS[filters.province].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field>
        <FieldLabel id={`${idPrefix}-price`}>{t("venues.filterPrice")}</FieldLabel>
        <ToggleGroup type="single" value={String(filters.maxPrice ?? "any")} onValueChange={(v) => v && onChange({ maxPrice: v === "any" ? null : Number(v) })} aria-labelledby={`${idPrefix}-price`}>
          <ToggleGroupItem value="any">{t("common.any")}</ToggleGroupItem>
          {PRICE_CAPS.map((cap) => (
            <ToggleGroupItem key={cap} value={String(cap)} className="font-num">
              {t("venues.upTo", { price: `$${cap}` })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-date`}>{t("venues.filterWhen")}</FieldLabel>
        <Select id={`${idPrefix}-date`} value={filters.date ?? ""} onChange={(e) => onChange({ date: e.target.value || null, from: e.target.value ? (filters.from ?? "18:00") : null })}>
          <option value="">{t("venues.anyDay")}</option>
          {days.map((d) => (
            <option key={d} value={d}>{dates.day(d)}</option>
          ))}
        </Select>
        {filters.date ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Select aria-label={t("venues.startTime")} value={filters.from ?? "18:00"} onChange={(e) => onChange({ from: e.target.value })} className="font-num">
              {START_TIMES.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </Select>
            <Select aria-label={t("venues.duration")} value={filters.duration} onChange={(e) => onChange({ duration: Number(e.target.value) })}>
              {[60, 90, 120].map((m) => (
                <option key={m} value={m}>{t("common.hours", { count: m / 60 })}</option>
              ))}
            </Select>
          </div>
        ) : null}
      </Field>
    </FieldGroup>
  );
}
