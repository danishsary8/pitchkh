"use client";

import type { Field as Pitch } from "@pitchkh/shared";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { SportIcon } from "@/components/brand/pitch-art";
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
import { type ContactErrors, rememberedContact, rememberContact, toBookingRequest } from "./contact";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch;
  field: Pitch;
  date: string;
  start: number;
  duration: number;
  onBooked: (booking: CreatedBooking) => void;
  /** Someone else got the slot first (HTTP 409). */
  onTaken: () => void;
  onError: (error: unknown) => void;
}

const ERROR_KEY = { name: "book.form.nameMissing", phone: "book.form.phoneInvalid", players: "book.form.playersInvalid" } as const;

/**
 * The only thing a customer fills in: who they are and how to reach them. No
 * account. Checked with the same schema the server uses (BookingRequest), so
 * what passes here passes there.
 */
export function BookingForm({ open, onOpenChange, branch, field, date, start, duration, onBooked, onTaken, onError }: Props) {
  const t = useTranslations();
  const dates = useDates();
  // This form only mounts after a pitch is picked, so it always runs in the browser.
  const [known] = useState(() => rememberedContact(getMiniApp()?.initDataUnsafe.user));
  const [name, setName] = useState(known.name);
  const [phone, setPhone] = useState(known.phone);
  const [players, setPlayers] = useState(String(Math.min(10, field.maxPlayers)));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sending, setSending] = useState(false);
  const price = priceFor(field, start, start + duration);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const parsed = toBookingRequest({ branch: branch.slug, fieldId: field.id, date, startMin: start, duration }, { name, phone, players, note });
    setErrors(parsed.ok ? {} : parsed.errors);
    if (!parsed.ok) return;

    setSending(true);
    try {
      const booking = await client.book(parsed.request);
      rememberContact(parsed.request);
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
    <Sheet open={open} onOpenChange={onOpenChange} title={t("book.form.title")} description={t("book.form.howItWorks")}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {/* What is being booked, so the customer never wonders. */}
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card" style={{ color: `var(--sport-${field.sport})` }}>
            <SportIcon sport={field.sport} className="size-5.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {field.name} <span className="font-num font-medium text-muted-foreground">{field.format}</span>
            </p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {dates.day(date)}, <span className="font-num">{hhmm(start)}–{hhmm(start + duration)}</span>
            </p>
          </div>
          <Price usd={price} stacked className="text-right" />
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="b-name">{t("book.form.name")}</FieldLabel>
            <Input id="b-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-invalid={!!errors.name} aria-describedby={errors.name ? "b-name-error" : undefined} required />
            {errors.name ? <FieldError id="b-name-error">{t(ERROR_KEY.name)}</FieldError> : null}
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <Field>
              <FieldLabel htmlFor="b-phone">{t("book.form.phone")}</FieldLabel>
              <Input id="b-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="012 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "b-phone-error" : undefined} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="b-players">{t("book.form.players")}</FieldLabel>
              <Input id="b-players" type="number" inputMode="numeric" min={1} max={40} value={players} onChange={(e) => setPlayers(e.target.value)} aria-invalid={!!errors.players} aria-describedby={errors.players ? "b-players-error" : undefined} className="font-num" />
            </Field>
          </div>
          {errors.phone ? <FieldError id="b-phone-error">{t(ERROR_KEY.phone)}</FieldError> : null}
          {errors.players ? <FieldError id="b-players-error">{t(ERROR_KEY.players)}</FieldError> : null}
          <Field>
            <FieldLabel htmlFor="b-note">
              {t("book.form.note")} <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
            </FieldLabel>
            <Textarea id="b-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("book.form.notePlaceholder")} />
          </Field>
        </FieldGroup>

        <Button type="submit" size="lg" disabled={sending} className="w-full">
          {sending ? <Spinner /> : null}
          {t("book.form.send")}
        </Button>
      </form>
    </Sheet>
  );
}
