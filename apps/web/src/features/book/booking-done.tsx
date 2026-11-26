"use client";

import { formatUsd } from "@pitchkh/shared";
import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/components/common/link";
import { Price } from "@/components/common/price";
import { Button } from "@/components/ui/button";
import { hhmm } from "@/lib/booking-rules";
import { type Branch, branchName } from "@/lib/branches";
import type { CreatedBooking } from "@/lib/client";
import { useDates } from "@/lib/format";
import { getMiniApp } from "@/lib/telegram-webapp";
import { OwnerChatButton } from "./owner-chat";

/** After sending: the request code, what happens next, and a one-tap chat with the business. */
export function BookingDone({ branch, booking, onAgain }: { branch: Branch; booking: CreatedBooking; onAgain: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const dates = useDates();
  const field = branch.fields.find((f) => f.id === booking.fieldId);
  const when = `${dates.day(booking.date, false)}, ${hhmm(booking.startMin)}–${hhmm(booking.endMin)}`;
  const inTelegram = !!getMiniApp();
  const message = t("book.chat.aboutBooking", { code: booking.code, branch: branchName(branch, locale), pitch: field ? `${field.name} · ${field.format}` : "", when, price: formatUsd(booking.priceUsd) });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pt-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-12 text-primary motion-safe:animate-pitch-pop" aria-hidden />
        <h1 className="font-display text-[clamp(2rem,8vw,2.75rem)]">{t("book.done.title")}</h1>
        <p className="text-pretty text-muted-foreground">{inTelegram ? t("book.done.bodyTelegram") : t("book.done.body")}</p>
      </div>

      {/* The booking as a match ticket: what and when on the pitch-green stub, the code to quote below the tear line. */}
      <article aria-label={t("book.done.code")} className="overflow-hidden rounded-[1.25rem] bg-card shadow-[0_12px_40px_rgb(12_31_26/0.12)]">
        <div className="pitch-stripes flex flex-col gap-1 px-5 pt-5 pb-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-white/85">{branchName(branch, locale)}</p>
            <p className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">{t("book.status.pending")}</p>
          </div>
          <p className="font-display text-3xl">{field ? field.name : ""}</p>
          {field ? <p className="font-num text-sm text-white/85">{field.format} · {field.indoor ? t("common.indoor") : t("common.outdoor")}</p> : null}
          <p className="font-num mt-3 text-xl font-bold">{when}</p>
        </div>
        <div aria-hidden className="relative h-0">
          <span className="absolute -top-3 -left-3 size-6 rounded-full bg-background" />
          <span className="absolute -top-3 -right-3 size-6 rounded-full bg-background" />
          <span className="absolute inset-x-5 top-0 border-t-2 border-dashed border-border" />
        </div>
        <dl className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-5 pt-5 pb-5">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{t("book.done.code")}</dt>
            <dd className="font-num text-3xl font-bold tracking-[0.08em] select-all">{booking.code}</dd>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <dt className="text-xs text-muted-foreground">{t("book.done.price")}</dt>
            <dd className="flex flex-col items-end">
              <Price usd={booking.priceUsd} className="text-xl" />
              <span className="text-xs text-muted-foreground">{t("book.done.payAtVenue")}</span>
            </dd>
          </div>
        </dl>
      </article>

      <div className="flex flex-col gap-2">
        <OwnerChatButton size="lg" variant="default" message={message} />
        <Button size="lg" variant="secondary" onClick={onAgain}>{t("book.done.again")}</Button>
        <Button asChild variant="ghost">
          <Link href="/">{t("book.branch.allBranches")}</Link>
        </Button>
      </div>
    </div>
  );
}
