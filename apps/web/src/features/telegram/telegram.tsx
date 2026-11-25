"use client";

import { formatKhr, formatUsd, telegramChatUrl, telegramShareUrl, type Field, type MatchRequestDetail, type PriceBreakdown, type Venue } from "@pitchkh/shared";
import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useVenueText } from "@/features/venues/text";
import { useDates } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Telegram without a backend: every action is a t.me link the person opens
 * themselves. Set NEXT_PUBLIC_TELEGRAM_GROUP_URL to the real group's invite link.
 */
export const TELEGRAM_GROUP_URL = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL || "https://t.me/pitchkh_matches";

/**
 * A chat link opened by phone number cannot carry a message, so the message is
 * copied first and a toast says to paste it. The copy starts inside the click,
 * before the link opens, so browsers allow it; the link itself is a plain <a>,
 * so pop-up blockers leave it alone.
 */
function ChatLink({ phone, message, children, className, variant = "secondary", size }: { phone: string; message: string; children: ReactNode; className?: string; variant?: "secondary" | "default" | "accent"; size?: "sm" | "default" | "lg" }) {
  const t = useTranslations("telegram");
  // A number we cannot use falls back to Telegram's share screen, where the person picks the chat.
  const href = telegramChatUrl(phone) ?? telegramShareUrl("", message);
  const copy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(message).then(
      () => toast.success(t("copied")),
      () => undefined,
    );
  };
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={copy}>
        <Send />
        {children}
      </a>
    </Button>
  );
}

/** Venue page: message the owner on Telegram, next to "Call". */
export function VenueTelegramButton({ venue }: { venue: Venue }) {
  const t = useTranslations("telegram");
  const text = useVenueText();
  return (
    <ChatLink phone={venue.phone} message={t("venueHello", { venue: text.name(venue) })} size="sm" className="h-10">
      {t("venueButton")}
    </ChatLink>
  );
}

/** Booking flow, last step: send the chosen slot to the owner instead of booking in the app. */
export function TelegramBookingCard({ venue, field, date, startTime, endTime, teamSize, notes, price, className }: { venue: Venue; field: Field; date: string; startTime: string; endTime: string; teamSize: number; notes: string; price: PriceBreakdown; className?: string }) {
  const t = useTranslations("telegram");
  const text = useVenueText();
  const dates = useDates();
  const { user } = useAuth();
  const lines = [
    t("bookingText", {
      venue: text.name(venue),
      pitch: `${field.name} · ${field.format}`,
      day: dates.day(date, false),
      time: `${startTime}–${endTime}`,
      players: teamSize,
      price: `${formatUsd(price.totalUsd)} (${formatKhr(price.totalKhr)})`,
    }),
  ];
  if (notes.trim()) lines.push(t("bookingNotes", { notes: notes.trim() }));
  if (user) lines.push(t("bookingFrom", { name: user.name }));

  return (
    <section aria-labelledby="tg-book-title" className={cn("flex flex-col gap-3 rounded-2xl border-2 border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 id="tg-book-title" className="font-bold">{t("bookTitle")}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{t("bookBody")}</p>
      </div>
      <ChatLink phone={venue.phone} message={lines.join("\n")} className="shrink-0">
        {t("bookButton")}
      </ChatLink>
    </section>
  );
}

/** Match page: share the match to the Telegram group (Telegram asks which chat). */
export function PostMatchToTelegram({ match, className }: { match: MatchRequestDetail; className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const text = useVenueText();
  const dates = useDates();
  const message = t("telegram.matchText", {
    team: match.hostTeam.name,
    sport: t(`sport.${match.sport}`),
    level: t(`level.${match.level}`),
    size: t("matches.aSide", { count: match.teamSize }),
    day: dates.day(match.date, false),
    time: dates.range(match.startAt, match.endAt),
    venue: text.name(match.venue),
    area: match.venue.district,
  });
  const url = `${siteUrl}/${locale}/matches/${match.id}`;
  return (
    <Button variant="secondary" size="lg" className={className} asChild>
      <a href={telegramShareUrl(url, message)} target="_blank" rel="noopener noreferrer">
        <Send />
        {t("telegram.postMatch")}
      </a>
    </Button>
  );
}

/** Match board: invite to the Telegram group where matches are posted too. */
export function TelegramGroupBanner({ className }: { className?: string }) {
  const t = useTranslations("telegram");
  return (
    <section aria-labelledby="tg-group-title" className={cn("flex flex-col gap-3 rounded-2xl bg-card p-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#229ED9] text-white">
          <Send className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="tg-group-title" className="font-bold">{t("groupTitle")}</h2>
          <p className="text-sm text-pretty text-muted-foreground">{t("groupBody")}</p>
        </div>
      </div>
      <Button variant="secondary" className="shrink-0" asChild>
        <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noopener noreferrer">{t("groupButton")}</a>
      </Button>
    </section>
  );
}
