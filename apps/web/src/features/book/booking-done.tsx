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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-14 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold text-balance">{t("book.done.title")}</h1>
        <p className="text-pretty text-muted-foreground">{inTelegram ? t("book.done.bodyTelegram") : t("book.done.body")}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-card p-4 text-sm">
        <dt className="text-muted-foreground">{t("book.done.code")}</dt>
        <dd className="font-num text-base font-bold tracking-wide">{booking.code}</dd>
        <dt className="text-muted-foreground">{t("book.done.place")}</dt>
        <dd>{branchName(branch, locale)}{field ? ` · ${field.name} (${field.format})` : ""}</dd>
        <dt className="text-muted-foreground">{t("book.done.when")}</dt>
        <dd className="font-num">{when}</dd>
        <dt className="text-muted-foreground">{t("book.done.price")}</dt>
        <dd><Price usd={booking.priceUsd} /> <span className="text-muted-foreground">· {t("book.done.payAtVenue")}</span></dd>
        <dt className="text-muted-foreground">{t("common.status")}</dt>
        <dd className="font-semibold text-warning">{t("book.status.pending")}</dd>
      </dl>
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
