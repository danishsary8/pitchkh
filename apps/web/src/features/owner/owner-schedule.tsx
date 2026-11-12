"use client";

import { APP, minutesOf, timeInPP, timeOf, type AvailabilityBlock, type BookingDetail } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page";
import { EmptyState, ErrorState, useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { DateStrip } from "@/features/booking/slot-picker";
import { useVenueText } from "@/features/venues/text";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

const HOUR_PX = 72;

export function OwnerSchedule() {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const venues = useQuery({ queryKey: qk.owner.venues, queryFn: api.owner.venues });
  const [venueId, setVenueId] = useState("");
  const [date, setDate] = useState(dates.today);
  const [blockOpen, setBlockOpen] = useState(false);
  const [draft, setDraft] = useState({ fieldId: "", startTime: "12:00", endTime: "14:00", reason: "" });
  const live = venues.data?.filter((v) => v.status === "approved") ?? [];
  const venue = live.find((v) => v.id === venueId) ?? live[0];
  const schedule = useQuery({ queryKey: qk.owner.schedule(venue?.id ?? "", date), queryFn: () => api.owner.schedule(venue?.id ?? "", date), enabled: !!venue });
  const refresh = async (): Promise<void> => { await queryClient.invalidateQueries({ queryKey: ["owner", "schedule"] }); await queryClient.invalidateQueries({ queryKey: ["availability"] }); };
  const addBlock = useMutation({ mutationFn: () => api.owner.createBlock({ ...draft, fieldId: draft.fieldId || (schedule.data?.fields[0]?.id ?? ""), date }), onSuccess: async () => { await refresh(); setBlockOpen(false); toast.success(t("owner.blocked")); }, onError: (e) => toast.error(errorMessage(e)) });
  const removeBlock = useMutation({ mutationFn: (id: string) => api.owner.deleteBlock(id), onSuccess: async () => { await refresh(); toast(t("owner.unblocked")); }, onError: (e) => toast.error(errorMessage(e)) });

  if (venues.isPending) return <><PageHeader title={t("owner.nav.schedule")} /><Skeleton className="h-96" /></>;
  if (venues.isError) return <ErrorState error={venues.error} onRetry={() => void venues.refetch()} />;
  if (!venue) return <><PageHeader title={t("owner.nav.schedule")} /><EmptyState icon={<Ban />} title={t("owner.noLiveVenueTitle")} body={t("owner.noLiveVenueBody")} /></>;

  const data = schedule.data;
  const open = data ? minutesOf(data.open) : 360;
  const close = data ? minutesOf(data.close) : 1380;
  const hours = Array.from({ length: Math.ceil((close - open) / 60) }, (_, i) => open + i * 60);
  const left = (time: string): number => ((minutesOf(time) - open) / 60) * HOUR_PX;
  const width = (start: string, end: string): number => ((minutesOf(end === "00:00" ? "24:00" : end) - minutesOf(start)) / 60) * HOUR_PX - 4;
  const bookingStyle = (b: BookingDetail) => ({ left: left(timeInPP(b.startAt)), width: width(timeInPP(b.startAt), timeInPP(b.endAt)) });
  const blockStyle = (k: AvailabilityBlock) => ({ left: left(k.startTime), width: width(k.startTime, k.endTime) });
  const times = Array.from({ length: (close - open) / APP.slotMinutes + 1 }, (_, i) => timeOf(open + i * APP.slotMinutes));

  return (
    <>
      <PageHeader title={t("owner.nav.schedule")} subtitle={t("owner.scheduleBody")} action={<Button variant="secondary" onClick={() => setBlockOpen(true)}><Plus />{t("owner.blockTime")}</Button>} />
      <div className="flex flex-col gap-4">
        {live.length > 1 ? (
          <Select aria-label={t("matches.venue")} value={venue.id} onChange={(e) => setVenueId(e.target.value)} className="sm:max-w-sm">
            {live.map((v) => <option key={v.id} value={v.id}>{text.name(v)}</option>)}
          </Select>
        ) : null}
        <DateStrip value={date} onChange={setDate} />
        {schedule.isPending ? <Skeleton className="h-72" /> : schedule.isError ? <ErrorState error={schedule.error} onRetry={() => void schedule.refetch()} /> : data?.closed ? (
          <EmptyState icon={<Ban />} title={t("booking.closedTitle")} />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card">
            <p className="px-4 pt-3 text-sm text-muted-foreground">{t("owner.scheduleSummary", { bookings: data?.bookings.length ?? 0, blocks: data?.blocks.length ?? 0 })}</p>
            <div className="overflow-x-auto overscroll-x-contain p-4" tabIndex={0} role="region" aria-label={t("owner.nav.schedule")}>
              <div style={{ width: hours.length * HOUR_PX + 112 }}>
                <div className="flex pl-28" aria-hidden>
                  {hours.map((h) => <span key={h} className="font-num shrink-0 text-xs text-muted-foreground" style={{ width: HOUR_PX }}>{timeOf(h)}</span>)}
                </div>
                <ul className="flex flex-col gap-2 pt-2">
                  {data?.fields.map((field) => (
                    <li key={field.id} className="flex items-center">
                      <p className="w-28 shrink-0 pr-2 text-sm leading-tight font-bold">{field.name}<span className="block text-xs font-normal text-muted-foreground">{t(`sport.${field.sport}`)}</span></p>
                      <div className="relative h-14 flex-1 rounded-xl bg-[repeating-linear-gradient(90deg,var(--secondary)_0_1px,transparent_1px_72px)] bg-secondary/40">
                        {data.bookings.filter((b) => b.fieldId === field.id).map((b) => (
                          <div key={b.id} className={cn("absolute inset-y-1 flex flex-col justify-center overflow-hidden rounded-lg px-2 text-xs leading-tight", b.status === "pending" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")} style={bookingStyle(b)} title={`${b.customer.name} · ${dates.range(b.startAt, b.endAt)}`}>
                            <span className="truncate font-bold">{b.customer.name}</span>
                            <span className="font-num truncate opacity-85">{dates.range(b.startAt, b.endAt)}</span>
                          </div>
                        ))}
                        {data.blocks.filter((k) => k.fieldId === field.id).map((k) => (
                          <button key={k.id} type="button" onClick={() => removeBlock.mutate(k.id)} className="absolute inset-y-1 flex items-center gap-1 overflow-hidden rounded-lg bg-foreground/80 px-2 text-xs font-semibold text-background outline-none focus-visible:ring-2 focus-visible:ring-ring" style={blockStyle(k)} aria-label={t("owner.removeBlock", { reason: k.reason || t("owner.blockedLabel") })}>
                            <Trash2 className="size-3.5 shrink-0" />
                            <span className="truncate">{k.reason || t("owner.blockedLabel")}</span>
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" />{t("status.booking.confirmed")}</li>
              <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-accent" />{t("status.booking.pending")}</li>
              <li className="flex items-center gap-1.5"><span className="size-3 rounded bg-foreground/80" />{t("owner.blockedLabel")}</li>
            </ul>
          </div>
        )}
      </div>

      <Sheet open={blockOpen} onOpenChange={setBlockOpen} title={t("owner.blockTime")} description={t("owner.blockBody", { day: dates.day(date) })} footer={<><Button variant="secondary" onClick={() => setBlockOpen(false)}>{t("common.cancel")}</Button><Button disabled={addBlock.isPending || draft.startTime >= draft.endTime} onClick={() => addBlock.mutate()}>{addBlock.isPending ? <Spinner /> : null}{t("owner.blockTime")}</Button></>}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="b-field">{t("booking.field")}</FieldLabel>
            <Select id="b-field" value={draft.fieldId || (data?.fields[0]?.id ?? "")} onChange={(e) => setDraft({ ...draft, fieldId: e.target.value })}>
              {data?.fields.map((f) => <option key={f.id} value={f.id}>{f.name} · {t(`sport.${f.sport}`)}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field><FieldLabel htmlFor="b-from">{t("common.from")}</FieldLabel><Select id="b-from" className="font-num" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}>{times.slice(0, -1).map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field><FieldLabel htmlFor="b-to">{t("common.to")}</FieldLabel><Select id="b-to" className="font-num" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}>{times.slice(1).map((x) => <option key={x}>{x}</option>)}</Select></Field>
          </div>
          <Field><FieldLabel htmlFor="b-reason">{t("owner.blockReason")}</FieldLabel><Input id="b-reason" value={draft.reason} maxLength={120} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder={t("owner.blockReasonPlaceholder")} /></Field>
        </FieldGroup>
      </Sheet>
    </>
  );
}
