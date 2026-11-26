"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { type Booking, DURATIONS, hhmm, isPast, STAFF_GRACE_MIN, startTimes } from "@/lib/booking-rules";
import type { Branch } from "@/lib/branches";
import { client, HttpError } from "@/lib/client";
import { useDates } from "@/lib/format";

/** Staff add a walk-in or phone booking. It is confirmed at once and blocks the slot for customers. */
export function AddBookingSheet({ branch, date, initial, onClose, onDone }: { branch: Branch; date: string; initial: { fieldId: string; startMin: number }; onClose: () => void; onDone: (b: Booking) => void }) {
  const t = useTranslations();
  const dates = useDates();
  const [fieldId, setFieldId] = useState(initial.fieldId);
  const [duration, setDuration] = useState<number>(60);
  const times = startTimes(branch, duration).filter((m) => !isPast(date, m, new Date(), STAFF_GRACE_MIN));
  const [startMin, setStartMin] = useState(times.includes(initial.startMin) ? initial.startMin : (times[0] ?? -1));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => client.admin.create({ branch: branch.slug, fieldId, date, startMin, duration, name: name.trim(), phone: phone.trim(), players: 1, note: note.trim() }),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof HttpError && e.code === "slot_taken" ? t("staff.toast.clash") : e instanceof HttpError && e.code === "invalid" ? t("staff.addInvalid") : t("book.errors.unavailable")),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError(t("book.form.nameMissing"));
    if (startMin < 0) return setError(t("book.branch.noTimes"));
    save.mutate();
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }} title={t("staff.add")} description={`${branch.name} · ${dates.day(date, false)}`}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="a-field">{t("staff.detail.place")}</FieldLabel>
            <Select id="a-field" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
              {branch.fields.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.format} · {t(`sport.${f.sport}`)}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="a-start">{t("common.time")}</FieldLabel>
              <Select id="a-start" value={startMin} onChange={(e) => setStartMin(Number(e.target.value))} className="font-num">
                {times.map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="a-duration">{t("book.branch.duration")}</FieldLabel>
              <Select id="a-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="font-num">
                {DURATIONS.map((d) => <option key={d} value={d}>{t("common.minutes", { count: d })}</option>)}
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="a-name">{t("book.form.name")}</FieldLabel>
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field>
            <FieldLabel htmlFor="a-phone">{t("book.form.phone")} <span className="font-normal text-muted-foreground">({t("common.optional")})</span></FieldLabel>
            <Input id="a-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
          </Field>
          <Field>
            <FieldLabel htmlFor="a-note">{t("book.form.note")} <span className="font-normal text-muted-foreground">({t("common.optional")})</span></FieldLabel>
            <Textarea id="a-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
        </FieldGroup>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? <Spinner /> : null}
          {t("staff.addSave")}
        </Button>
      </form>
    </Sheet>
  );
}
