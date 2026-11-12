import type { StorageAdapter } from "./mock/storage";

export type ApiMode = "mock" | "real";

/** Minimal fetch typings so shared code needs neither DOM nor Node libs. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}
export interface FetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
export type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>;

/**
 * Everything the shared layer needs from the host platform is injected here.
 * The web app passes localStorage + window.fetch; the mobile app will pass
 * AsyncStorage + the React Native fetch. Shared code never reads env vars.
 */
export interface SharedConfig {
  /** "mock" = in-memory DB behind the same REST contract. "real" = HTTP to apiUrl. */
  apiMode: ApiMode;
  /** Base URL of the real backend, e.g. https://api.pitchkh.com/v1 */
  apiUrl: string;
  /** Persists the session tokens (both modes) and the mock DB (mock mode). */
  storage: StorageAdapter;
  /** Required in "real" mode. */
  fetch?: FetchLike;
  /** Simulated latency window for mock mode, in ms. */
  latency?: readonly [min: number, max: number];
  /** Clock injection keeps domain logic testable. */
  now?: () => Date;
  /** Called when the session can no longer be refreshed (sign the user out). */
  onSessionExpired?: () => void;
}

export const DEFAULT_LATENCY: readonly [number, number] = [300, 800];

/** Business constants shared by the UI, the mock server and (later) the backend. */
export const APP = {
  timezone: "Asia/Phnom_Penh",
  utcOffset: "+07:00",
  utcOffsetMinutes: 7 * 60,
  khrPerUsd: 4100,
  slotMinutes: 30,
  minBookingMinutes: 60,
  maxBookingMinutes: 240,
  bookingWindowDays: 30,
  freeCancelHours: 2,
  serviceFeeRate: 0.03,
  refereeUsdPerHour: 5,
  waterBottleUsd: 0.5,
  ballRentalUsd: 2,
  bibsRentalUsd: 3,
  weekendSurchargeRate: 0.1,
  peakStart: "17:00",
  peakEnd: "22:00",
} as const;
