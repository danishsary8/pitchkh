"use client";

import { AMENITIES, DISTRICTS, PROVINCE_CENTERS, PROVINCES, SPORTS, SURFACES, type Amenity, type Field as VenueField, type Province, type Sport, type Surface, type UpsertFieldDto, type UpsertVenueDto, type VenueDetail } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Map, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@/components/common/link";
import { PageHeader, Rating, SportBadge } from "@/components/common/page";
import { EmptyState, ErrorState, useErrorMessage } from "@/components/common/states";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert, Checkbox, Spinner, Switch } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useMoney } from "@/lib/format";
import { qk } from "@/lib/query";
import { VenuePhotos } from "./venue-photos";

const STATUS_VARIANT: Record<VenueDetail["status"], BadgeVariant> = { approved: "success", pending: "warning", rejected: "destructive", suspended: "muted" };
const DEFAULT_SURFACE: Record<Sport, Surface> = { football: "artificial_turf", volleyball: "parquet", tennis: "hard_court" };
const DEFAULT_FORMAT: Record<Sport, string> = { football: "7v7", volleyball: "6v6", tennis: "Singles/Doubles" };

const blankField = (sport: Sport = "football"): UpsertFieldDto => ({ sport, name: "", position: "", surface: DEFAULT_SURFACE[sport], indoor: false, format: DEFAULT_FORMAT[sport], maxPlayers: sport === "tennis" ? 4 : sport === "volleyball" ? 14 : 16, pricePerHourUsd: 15, peakPricePerHourUsd: 20, lit: true, status: "active" });

function FieldSheet({ venueId, field, open, onOpenChange }: { venueId: string; field: VenueField | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState<UpsertFieldDto>(field ? { ...field } : blankField());
  const set = (patch: Partial<UpsertFieldDto>): void => setForm((f) => ({ ...f, ...patch }));
  const done = async (message: string): Promise<void> => { await queryClient.invalidateQueries({ queryKey: ["owner"] }); await queryClient.invalidateQueries({ queryKey: ["venues"] }); toast.success(message); onOpenChange(false); };
  const save = useMutation({ mutationFn: () => (field ? api.owner.updateField(field.id, form) : api.owner.createField(venueId, form)), onSuccess: () => done(t("common.saved")), onError: (e) => toast.error(errorMessage(e)) });
  const remove = useMutation({ mutationFn: () => api.owner.deleteField(field?.id ?? ""), onSuccess: () => done(t("owner.fieldDeleted")), onError: (e) => toast.error(errorMessage(e)) });
  const valid = form.name.trim().length > 0 && Number(form.pricePerHourUsd) > 0 && Number(form.peakPricePerHourUsd) > 0;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={field ? t("owner.editField") : t("owner.addField")} description={t("owner.fieldBody")}
      footer={<>{field ? <Button variant="outline" className="text-destructive" disabled={remove.isPending} onClick={() => remove.mutate()}><Trash2 />{t("common.delete")}</Button> : <Button variant="secondary" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>}<Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Spinner /> : null}{t("common.save")}</Button></>}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field><FieldLabel htmlFor="f-sport">{t("venues.filterSport")}</FieldLabel><Select id="f-sport" value={form.sport} onChange={(e) => { const sport = e.target.value as Sport; set({ sport, surface: DEFAULT_SURFACE[sport], format: DEFAULT_FORMAT[sport] }); }}>{SPORTS.map((s) => <option key={s} value={s}>{t(`sport.${s}`)}</option>)}</Select></Field>
          <Field><FieldLabel htmlFor="f-name">{t("owner.fieldName")}</FieldLabel><Input id="f-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Pitch A" /></Field>
        </div>
        <Field><FieldLabel htmlFor="f-pos">{t("owner.fieldPosition")}</FieldLabel><Input id="f-pos" value={form.position ?? ""} onChange={(e) => set({ position: e.target.value })} placeholder={t("owner.fieldPositionPlaceholder")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field><FieldLabel htmlFor="f-surface">{t("owner.surface")}</FieldLabel><Select id="f-surface" value={form.surface} onChange={(e) => set({ surface: e.target.value as Surface })}>{SURFACES.map((s) => <option key={s} value={s}>{t(`surface.${s}`)}</option>)}</Select></Field>
          <Field><FieldLabel htmlFor="f-format">{t("owner.format")}</FieldLabel><Input id="f-format" value={form.format} onChange={(e) => set({ format: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field><FieldLabel htmlFor="f-price">{t("owner.price")}</FieldLabel><Input id="f-price" type="number" inputMode="decimal" min={1} step="0.5" className="font-num" value={Number(form.pricePerHourUsd)} onChange={(e) => set({ pricePerHourUsd: Number(e.target.value) })} /></Field>
          <Field><FieldLabel htmlFor="f-peak">{t("owner.peakPrice")}</FieldLabel><Input id="f-peak" type="number" inputMode="decimal" min={1} step="0.5" className="font-num" value={Number(form.peakPricePerHourUsd)} onChange={(e) => set({ peakPricePerHourUsd: Number(e.target.value) })} /></Field>
          <Field><FieldLabel htmlFor="f-max">{t("owner.maxPlayers")}</FieldLabel><Input id="f-max" type="number" inputMode="numeric" min={2} max={40} className="font-num" value={Number(form.maxPlayers)} onChange={(e) => set({ maxPlayers: Number(e.target.value) })} /></Field>
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">{t("owner.priceHint")}</p>
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-secondary px-3.5 font-semibold">{t("common.indoor")}<Switch checked={form.indoor} onCheckedChange={(indoor) => set({ indoor })} /></label>
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-secondary px-3.5 font-semibold">{t("owner.openForBooking")}<Switch checked={form.status !== "maintenance"} onCheckedChange={(on) => set({ status: on ? "active" : "maintenance" })} /></label>
      </FieldGroup>
    </Sheet>
  );
}

const blankVenue = (): UpsertVenueDto => ({ name: "", nameKm: "", description: "", descriptionKm: "", province: "phnom_penh", district: DISTRICTS.phnom_penh[0] ?? "", address: "", lat: PROVINCE_CENTERS.phnom_penh[0], lng: PROVINCE_CENTERS.phnom_penh[1], phone: "", amenities: ["parking", "floodlights"], openingHours: Array.from({ length: 7 }, (_, weekday) => ({ weekday, open: "06:00", close: "22:00", closed: false })) });

function VenueSheet({ venue, open, onOpenChange }: { venue: VenueDetail | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [form, setForm] = useState<UpsertVenueDto>(venue ? { name: venue.name, nameKm: venue.nameKm, description: venue.description, descriptionKm: venue.descriptionKm, province: venue.province, district: venue.district, address: venue.address, lat: venue.lat, lng: venue.lng, phone: venue.phone, amenities: venue.amenities, openingHours: venue.openingHours } : blankVenue());
  const set = (patch: Partial<UpsertVenueDto>): void => setForm((f) => ({ ...f, ...patch }));
  const hours = form.openingHours[0] ?? { open: "06:00", close: "22:00" };
  const setHours = (patch: { open?: string; close?: string }): void => set({ openingHours: form.openingHours.map((h) => ({ ...h, ...patch })) });
  const save = useMutation({
    mutationFn: () => (venue ? api.owner.updateVenue(venue.id, form) : api.owner.createVenue(form)),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["owner"] }); await queryClient.invalidateQueries({ queryKey: ["venues"] }); toast.success(venue ? t("common.saved") : t("owner.venueSubmitted")); onOpenChange(false); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const valid = form.name.trim().length >= 3 && form.description.trim().length >= 10 && form.address.trim().length >= 4 && form.phone.trim().length >= 8 && hours.open < hours.close;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={venue ? t("owner.editVenue") : t("owner.addVenue")} description={venue ? undefined : t("owner.addVenueBody")} className="md:w-[min(40rem,calc(100vw-2rem))]"
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Spinner /> : null}{venue ? t("common.save") : t("owner.submitForReview")}</Button></>}>
      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="v-name">{t("owner.venueName")}</FieldLabel><Input id="v-name" value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field><FieldLabel htmlFor="v-name-km">{t("owner.venueNameKm")}</FieldLabel><Input id="v-name-km" lang="km" value={form.nameKm ?? ""} onChange={(e) => set({ nameKm: e.target.value })} /></Field>
        </div>
        <Field><FieldLabel htmlFor="v-desc">{t("owner.description")}</FieldLabel><Textarea id="v-desc" value={form.description} maxLength={1200} onChange={(e) => set({ description: e.target.value })} placeholder={t("owner.descriptionPlaceholder")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field><FieldLabel htmlFor="v-prov">{t("venues.filterProvince")}</FieldLabel><Select id="v-prov" value={form.province} onChange={(e) => { const province = e.target.value as Province; set({ province, district: DISTRICTS[province][0] ?? "", lat: PROVINCE_CENTERS[province][0], lng: PROVINCE_CENTERS[province][1] }); }}>{PROVINCES.map((p) => <option key={p} value={p}>{t(`province.${p}`)}</option>)}</Select></Field>
          <Field><FieldLabel htmlFor="v-dist">{t("venues.filterDistrict")}</FieldLabel><Select id="v-dist" value={form.district} onChange={(e) => set({ district: e.target.value })}>{DISTRICTS[form.province].map((d) => <option key={d}>{d}</option>)}</Select></Field>
        </div>
        <Field><FieldLabel htmlFor="v-addr">{t("owner.address")}</FieldLabel><Input id="v-addr" autoComplete="street-address" value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field><FieldLabel htmlFor="v-phone">{t("common.phone")}</FieldLabel><Input id="v-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field><FieldLabel htmlFor="v-open">{t("owner.opens")}</FieldLabel><Input id="v-open" type="time" step={1800} className="font-num" value={hours.open} onChange={(e) => setHours({ open: e.target.value })} /></Field>
          <Field><FieldLabel htmlFor="v-close">{t("owner.closes")}</FieldLabel><Input id="v-close" type="time" step={1800} className="font-num" value={hours.close} onChange={(e) => setHours({ close: e.target.value })} /></Field>
        </div>
        <FieldSet>
          <FieldLegend>{t("venue.amenities")}</FieldLegend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {AMENITIES.map((a) => (
              <label key={a} className="flex min-h-11 items-center gap-2.5 text-[0.95rem]">
                <Checkbox checked={form.amenities.includes(a)} onCheckedChange={(on) => set({ amenities: on ? [...form.amenities, a] : form.amenities.filter((x: Amenity) => x !== a) })} />
                {t(`amenity.${a}`)}
              </label>
            ))}
          </div>
        </FieldSet>
      </FieldGroup>
    </Sheet>
  );
}

export function OwnerVenues() {
  const t = useTranslations();
  const money = useMoney();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.owner.venues, queryFn: api.owner.venues });
  const [venueSheet, setVenueSheet] = useState<{ venue: VenueDetail | null } | null>(null);
  const [fieldSheet, setFieldSheet] = useState<{ venueId: string; field: VenueField | null } | null>(null);
  return (
    <>
      <PageHeader title={t("owner.nav.venues")} subtitle={t("owner.venuesBody")} action={<Button onClick={() => setVenueSheet({ venue: null })}><Plus />{t("owner.addVenue")}</Button>} />
      {isPending ? <div className="flex flex-col gap-4" aria-busy>{[0, 1].map((i) => <Skeleton key={i} className="h-64" />)}</div> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.length === 0 ? (
        <EmptyState icon={<Store />} title={t("owner.noVenuesTitle")} body={t("owner.noVenuesBody")}><Button onClick={() => setVenueSheet({ venue: null })}>{t("owner.addVenue")}</Button></EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((venue) => (
            <li key={venue.id} className="flex flex-col gap-4 rounded-3xl bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={STATUS_VARIANT[venue.status]}>{t(`status.venue.${venue.status}`)}</Badge>
                    {venue.featured ? <Badge variant="accent">{t("common.featured")}</Badge> : null}
                    {venue.sports.map((s) => <SportBadge key={s} sport={s} />)}
                  </div>
                  <h2 className="text-xl leading-snug font-bold">{venue.name}</h2>
                  <p className="text-sm text-muted-foreground">{venue.district}, {t(`province.${venue.province}`)} · <Rating value={venue.rating} count={venue.reviewCount} className="align-middle" /></p>
                </div>
                <div className="flex gap-2">
                  {venue.status === "approved" ? <Button asChild variant="ghost" size="icon" aria-label={t("owner.viewListing")}><Link href={`/venues/${venue.slug}`}><ExternalLink /></Link></Button> : null}
                  <Button variant="secondary" onClick={() => setVenueSheet({ venue })}><Pencil />{t("common.edit")}</Button>
                </div>
              </div>
              {venue.status === "rejected" && venue.moderationNote ? <Alert variant="destructive" title={t("owner.rejectedTitle")}>{venue.moderationNote}</Alert> : null}
              {venue.status === "pending" ? <Alert variant="warning" title={t("owner.pendingTitle")}>{t("owner.pendingBody")}</Alert> : null}
              <VenuePhotos venue={venue} />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{t("owner.fieldsAndPricing")}</h3>
                  <div className="flex gap-1">
                    {venue.fields.length > 0 ? <Button asChild variant="ghost" size="sm" className="h-10"><Link href={`/owner/venues/${venue.id}/layout`}><Map />{t("owner.layout.edit")}</Link></Button> : null}
                    <Button variant="ghost" size="sm" className="h-10" onClick={() => setFieldSheet({ venueId: venue.id, field: null })}><Plus />{t("owner.addField")}</Button>
                  </div>
                </div>
                {venue.fields.length === 0 ? <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{t("owner.noFields")}</p> : (
                  <ul className="grid gap-2 md:grid-cols-2">
                    {venue.fields.map((field) => (
                      <li key={field.id}>
                        <button type="button" onClick={() => setFieldSheet({ venueId: venue.id, field })} className="press flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 font-bold">{field.name}<Badge variant="outline" className="font-num">{field.format}</Badge>{field.status === "maintenance" ? <Badge variant="warning">{t("status.field.maintenance")}</Badge> : null}</span>
                            <span className="block truncate text-sm text-muted-foreground">{t(`sport.${field.sport}`)} · {t(`surface.${field.surface}`)} · {field.indoor ? t("common.indoor") : t("common.outdoor")}</span>
                          </span>
                          <span className="font-num shrink-0 text-right text-sm"><span className="block font-bold">{money.usd(field.pricePerHourUsd)}</span><span className="block text-muted-foreground">{money.usd(field.peakPricePerHourUsd)} {t("venue.peak")}</span></span>
                          <Pencil className="size-4 shrink-0 text-muted-foreground" aria-label={t("common.edit")} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {venueSheet ? <VenueSheet key={venueSheet.venue?.id ?? "new"} venue={venueSheet.venue} open onOpenChange={(o) => !o && setVenueSheet(null)} /> : null}
      {fieldSheet ? <FieldSheet key={fieldSheet.field?.id ?? "new"} venueId={fieldSheet.venueId} field={fieldSheet.field} open onOpenChange={(o) => !o && setFieldSheet(null)} /> : null}
    </>
  );
}
