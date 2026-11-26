"use client";

import type { Field as Pitch } from "@pitchkh/shared";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Price } from "@/components/common/price";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { hhmm, priceFor } from "@/lib/booking-rules";
import type { Branch } from "@/lib/branches";
import { client, type CreatedBooking, HttpError } from "@/lib/client";
import { useDates } from "@/lib/format";
import { getMiniApp } from "@/lib/telegram-webapp";

const REMEMBER = "pitchkh-contact";

function rememberedContact(): { name: string; phone: string } {
  const tg = getMiniApp()?.initDataUnsafe.user;
  const tgName = [tg?.first_name, tg?.last_name].filter(Boolean).join(" ");
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER) ?? "null") as { name?: string; phone?: string } | null;
    return { name: saved?.name || tgName, phone: saved?.phone || "" };
  } catch {
    return { name: tgName, phone: "" };
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch;
  field: Pitch;
  date: string;
  start: number;
  duration: number;
  onBooked: (booking: CreatedBooking) => void;
  onTaken: () => void;
  onError: (error: unknown) => void;
}

/** The only thing a customer fills in: who they are and how to reach them. No account. */
export function BookingForm({ open, onOpenChange, branch, field, date, start, duration, onBooked, onTaken, onError }: Props) {
  const t = useTranslations();
  const dates = useDates();
  // Fill in what we know: last time's details, or the Telegram name. This form
  // only mounts after the customer picks a pitch, so it always runs in the browser.
  const [known] = useState(rememberedContact);
  const [name, setName] = useState(known.name);
  const [phone, setPhone] = useState(known.phone);
  const [players, setPlayers] = useState(String(Math.min(10, field.maxPlayers)));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t("book.form.nameMissing");
    if (!/^\+?\d{8,15}$/.test(phone.replace(/[\s().-]/g, ""))) next.phone = t("book.form.phoneInvalid");
    const count = Number(players);
    if (!Number.isInteger(count) || count < 1 || count > 40) next.players = t("book.form.playersInvalid");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      const booking = await client.book({ branch: branch.slug, fieldId: field.id, date, startMin: start, duration, name: name.trim(), phone: phone.trim(), players: count, note: note.trim() });
      try {
        localStorage.setItem(REMEMBER, JSON.stringify({ name: name.trim(), phone: phone.trim() }));
      } catch {
        // Not remembered; that's fine.
      }
      getMiniApp()?.HapticFeedback?.impactOccurred("medium");
      onBooked(booking);
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) onTaken();
      else onError(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("book.form.title")}
      description={`${field.name} · ${field.format} · ${dates.day(date)} · ${hhmm(start)}–${hhmm(start + duration)}`}
    >
      <form id="booking-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="b-name">{t("book.form.name")}</FieldLabel>
            <Input id="b-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-invalid={!!errors.name} required />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="b-phone">{t("book.form.phone")}</FieldLabel>
            <Input id="b-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="012 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} aria-invalid={!!errors.phone} required />
            {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="b-players">{t("book.form.players")}</FieldLabel>
            <Input id="b-players" type="number" inputMode="numeric" min={1} max={40} value={players} onChange={(e) => setPlayers(e.target.value)} aria-invalid={!!errors.players} className="font-num w-28" />
            {errors.players ? <FieldError>{errors.players}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="b-note">
              {t("book.form.note")} <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
            </FieldLabel>
            <Textarea id="b-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("book.form.notePlaceholder")} />
          </Field>
        </FieldGroup>
        <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
          <span className="text-sm font-semibold">{t("book.form.total")}</span>
          <Price usd={priceFor(field, start, start + duration)} />
        </div>
        <p className="text-sm text-pretty text-muted-foreground">{t("book.form.howItWorks")}</p>
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? <Spinner /> : null}
          {t("book.form.send")}
        </Button>
      </form>
    </Sheet>
  );
}
