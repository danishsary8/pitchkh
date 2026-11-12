import { APP } from "../config";
import type { Booking, MatchRequest, Sport } from "../types";
import { MATCH_SPORTS } from "../schemas/common";
import { addDays, dateInPP } from "./time";

/** A booking is "upcoming" until its end time passes, unless it was cancelled/rejected. */
export function isUpcoming(b: Pick<Booking, "endAt" | "status">, now: Date): boolean {
  return Date.parse(b.endAt) > now.getTime() && b.status !== "cancelled" && b.status !== "rejected" && b.status !== "completed";
}

/** Free cancellation is allowed until APP.freeCancelHours before kick-off. */
export function canCancel(b: Pick<Booking, "startAt" | "status">, now: Date): boolean {
  if (b.status !== "pending" && b.status !== "confirmed") return false;
  return Date.parse(b.startAt) - now.getTime() >= APP.freeCancelHours * 3_600_000;
}

export const canReschedule = canCancel;

/** Paid bookings are refunded on cancellation; cash bookings were never charged. */
export function refundStatus(b: Pick<Booking, "paymentStatus">): Booking["paymentStatus"] {
  return b.paymentStatus === "paid" ? "refunded" : b.paymentStatus;
}

/** Cash bookings wait for the venue owner; online payments confirm instantly. */
export function initialBookingState(paymentMethod: Booking["paymentMethod"]): Pick<Booking, "status" | "paymentStatus"> {
  return paymentMethod === "cash" ? { status: "pending", paymentStatus: "unpaid" } : { status: "confirmed", paymentStatus: "paid" };
}

export function isWithinBookingWindow(date: string, now: Date): boolean {
  const today = dateInPP(now);
  return date >= today && date <= addDays(today, APP.bookingWindowDays);
}

/** Opponent matching is offered for football and volleyball only. */
export function supportsMatching(sport: Sport): boolean {
  return (MATCH_SPORTS as readonly string[]).includes(sport);
}

export function isMatchJoinable(m: Pick<MatchRequest, "status" | "startAt">, now: Date): boolean {
  return m.status === "open" && Date.parse(m.startAt) > now.getTime();
}

/** Sensible default players-per-side for a field format like "7v7". */
export function defaultTeamSize(format: string, sport: Sport): number {
  const match = /^(\d+)v\d+$/.exec(format);
  if (match?.[1]) return Number(match[1]);
  return sport === "tennis" ? 2 : sport === "volleyball" ? 6 : 5;
}
