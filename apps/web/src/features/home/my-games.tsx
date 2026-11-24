"use client";

import type { BookingDetail } from "@pitchkh/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Navigation, Repeat, Send } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useShareBooking } from "@/features/booking/use-share-booking";
import { useVenueText } from "@/features/venues/text";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";

/** "in 3h 20m", "in 2 days", or "now" for a game that has started. */
function useCountdown(startAt: string, endAt: string) {
  const t = useTranslations("home.next");
  const now = useNow({ updateInterval: 30_000 });
  const start = Date.parse(startAt);
  if (now.getTime() >= start && now.getTime() < Date.parse(endAt)) return { label: t("playingNow"), soon: true };
  const minutes = Math.max(1, Math.round((start - now.getTime()) / 60_000));
  if (minutes < 60) return { label: t("inMinutes", { minutes }), soon: true };
  if (minutes < 48 * 60) return { label: t("inHours", { hours: Math.floor(minutes / 60), minutes: minutes % 60 }), soon: minutes < 3 * 60 };
  return { label: t("inDays", { days: Math.round(minutes / (24 * 60)) }), soon: false };
}

function NextGameCard({ booking }: { booking: BookingDetail }) {
  const t = useTranslations();
  const text = useVenueText();
  const dates = useDates();
  const share = useShareBooking();
  const countdown = useCountdown(booking.startAt, booking.endAt);
  return (
    <section aria-labelledby="next-game-title" className="relative overflow-hidden rounded-3xl bg-card text-card-foreground shadow-xl shadow-black/10">
      <Link href={`/booking/${booking.id}`} className="flex items-center gap-3 p-4 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-pitch">
          {booking.venue.photo ? <Image src={booking.venue.photo} alt="" fill sizes="56px" className="object-cover" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span id="next-game-title" className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{t("home.next.title")}</span>
            <span className={countdown.soon ? "rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground" : "rounded-full bg-secondary px-2 py-0.5 text-xs font-bold"}>{countdown.label}</span>
          </span>
          <span className="mt-0.5 block truncate text-lg leading-tight font-bold">
            {booking.field.name} <span className="font-num text-sm font-semibold text-muted-foreground">{booking.field.format}</span>
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {dates.day(booking.date)} · <span className="font-num">{dates.range(booking.startAt, booking.endAt)}</span> · {text.name(booking.venue)}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <Button variant="secondary" asChild>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${booking.venue.lat},${booking.venue.lng}`} target="_blank" rel="noopener noreferrer">
            <Navigation />
            {t("venue.directions")}
          </a>
        </Button>
        <Button onClick={() => void share(booking)}>
          <Send />
          {t("share.withTeam")}
        </Button>
      </div>
    </section>
  );
}

/** Signed-in players: their next game sits on top of the hero. Renders nothing otherwise. */
export function NextGame() {
  const { user } = useAuth();
  const query = { scope: "upcoming" as const, pageSize: 1 };
  const { data } = useQuery({ queryKey: qk.bookings(query), queryFn: () => api.bookings.list(query), enabled: user?.role === "player" });
  const next = data?.data.find((b) => b.status === "confirmed" || b.status === "pending");
  if (!user || !next) return null;
  return <NextGameCard booking={next} />;
}

/** Venues the player has booked before, newest first: one tap to the same pitch again. */
export function PlayAgain() {
  const t = useTranslations();
  const text = useVenueText();
  const { user } = useAuth();
  const query = { scope: "past" as const, pageSize: 20 };
  const { data } = useQuery({ queryKey: qk.bookings(query), queryFn: () => api.bookings.list(query), enabled: user?.role === "player" });
  if (!user || !data) return null;
  const seen = new Set<string>();
  const recent = data.data.filter((b) => b.status === "completed" || b.status === "confirmed").filter((b) => (seen.has(b.venue.id) ? false : (seen.add(b.venue.id), true))).slice(0, 6);
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="again-title" className="flex flex-col gap-3">
      <h2 id="again-title" className="flex items-center gap-2 text-base font-bold">
        <Repeat className="size-4.5 text-primary" aria-hidden />
        {t("home.playAgain")}
      </h2>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {recent.map((b) => (
          <li key={b.id} className="snap-start">
            <Link href={`/book/${b.venue.slug}?field=${b.fieldId}`} className="press flex h-16 w-60 items-center gap-3 rounded-2xl bg-card p-2 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-pitch">
                {b.venue.photo ? <Image src={b.venue.photo} alt="" fill sizes="48px" className="object-cover" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{text.name(b.venue)}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {b.field.name} · <span className="font-num">{b.field.format}</span>
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-primary">{t("booking.bookAgain")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
