"use client";

import type { Booking, BookingRequest, BookingStatus, TakenSlot } from "./booking-rules";
import { telegramInitData } from "./telegram-webapp";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

/** Calls the app's own server. Inside Telegram it adds the signed Telegram identity. */
async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const initData = telegramInitData();
  if (initData) headers["x-telegram-init-data"] = initData;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(path, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), cache: "no-store" });
  } catch {
    throw new HttpError(0, "network");
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new HttpError(response.status, data.error ?? "unknown");
  return data as T;
}

export interface CreatedBooking {
  code: string;
  status: BookingStatus;
  branch: string;
  fieldId: string;
  date: string;
  startMin: number;
  endMin: number;
  priceUsd: number;
}

export const client = {
  taken: (branch: string, date: string) => call<{ taken: TakenSlot[] }>(`/api/branches/${encodeURIComponent(branch)}/taken?date=${date}`).then((r) => r.taken),
  book: (body: BookingRequest) => call<{ booking: CreatedBooking }>("/api/bookings", { method: "POST", body }).then((r) => r.booking),
  admin: {
    me: () => call<{ ok: true; name: string }>("/api/admin/me"),
    day: (branch: string, date: string) => call<{ day: Booking[]; pending: Booking[] }>(`/api/admin/bookings?branch=${encodeURIComponent(branch)}&date=${date}`),
    create: (body: Omit<BookingRequest, "phone" | "players"> & { phone: string; players: number }) => call<{ booking: Booking }>("/api/admin/bookings", { method: "POST", body }).then((r) => r.booking),
    setStatus: (id: string, status: BookingStatus) => call<{ booking: Booking }>(`/api/admin/bookings/${id}`, { method: "PATCH", body: { status } }).then((r) => r.booking),
  },
};
