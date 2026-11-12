import type { BookingDetail } from "../types";

const stamp = (iso: string): string => new Date(Date.parse(iso)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (text: string): string => text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

/** Builds an .ics calendar event for a booking (works with Google, Apple and Outlook calendars). */
export function bookingToIcs(b: BookingDetail, title: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PitchKH//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.id}@pitchkh`,
    `DTSTAMP:${stamp(b.createdAt)}`,
    `DTSTART:${stamp(b.startAt)}`,
    `DTEND:${stamp(b.endAt)}`,
    `SUMMARY:${escape(title)}`,
    `LOCATION:${escape(`${b.venue.name}, ${b.venue.address}`)}`,
    `DESCRIPTION:${escape(`${b.field.name} · ${b.code}`)}`,
    `GEO:${b.venue.lat};${b.venue.lng}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Google Calendar "add event" link for the same booking. */
export function bookingToGoogleCalendarUrl(b: BookingDetail, title: string): string {
  const q = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(title)}`,
    `dates=${stamp(b.startAt)}/${stamp(b.endAt)}`,
    `location=${encodeURIComponent(`${b.venue.name}, ${b.venue.address}`)}`,
    `details=${encodeURIComponent(`${b.field.name} · ${b.code}`)}`,
    "ctz=Asia/Phnom_Penh",
  ];
  return `https://calendar.google.com/calendar/render?${q.join("&")}`;
}
