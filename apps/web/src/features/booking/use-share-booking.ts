"use client";

import type { BookingDetail } from "@pitchkh/shared";
import { useLocale, useTranslations } from "next-intl";
import { useVenueText } from "@/features/venues/text";
import { useDates } from "@/lib/format";
import { shareGame } from "@/lib/share";

/** Shares a booking with the team: pitch, venue, day and time, and a link to the venue. */
export function useShareBooking() {
  const t = useTranslations("share");
  const locale = useLocale();
  const dates = useDates();
  const text = useVenueText();
  return (booking: BookingDetail) => {
    const message = t("bookingText", {
      pitch: `${booking.field.name} · ${booking.field.format}`,
      venue: text.name(booking.venue),
      day: dates.day(booking.date),
      time: dates.range(booking.startAt, booking.endAt),
      address: `${booking.venue.address}, ${booking.venue.district}`,
    });
    return shareGame({ title: t("bookingTitle"), text: message, url: `${window.location.origin}/${locale}/venues/${booking.venue.slug}` });
  };
}
