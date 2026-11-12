import { APP } from "../config";
import type { Extras, Field, PriceBreakdown, PriceLine } from "../types";
import { isWeekend, minutesOf } from "./time";

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** USD -> KHR at the fixed display rate, rounded to the nearest 100 riel (smallest note). */
export function usdToKhr(usd: number): number {
  return Math.round((usd * APP.khrPerUsd) / 100) * 100;
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2).replace(/\.00$/, "")}`;
}

export function formatKhr(khr: number): string {
  return `${khr.toLocaleString("en-US")} ៛`;
}

/** Is a slot starting at `minute` inside the evening peak window? */
export function isPeakMinute(minute: number): boolean {
  return minute >= minutesOf(APP.peakStart) && minute < minutesOf(APP.peakEnd);
}

/** Hourly rate that applies to a slot starting at `minute`. */
export function rateAt(field: Pick<Field, "pricePerHourUsd" | "peakPricePerHourUsd">, minute: number): number {
  return isPeakMinute(minute) ? field.peakPricePerHourUsd : field.pricePerHourUsd;
}

export interface PriceInput {
  field: Pick<Field, "pricePerHourUsd" | "peakPricePerHourUsd">;
  date: string;
  startTime: string;
  endTime: string;
  referee: boolean;
  extras: Extras;
}

/**
 * The single source of truth for what a booking costs. The UI calls this for an
 * instant quote; the backend must reproduce it exactly (see docs/API_CONTRACT.md).
 */
export function calculatePrice(input: PriceInput): PriceBreakdown {
  const start = minutesOf(input.startTime);
  const end = minutesOf(input.endTime);
  const durationMin = Math.max(0, end - start);

  let offPeakMin = 0;
  let peakMin = 0;
  for (let m = start; m < end; m += APP.slotMinutes) {
    if (isPeakMinute(m)) peakMin += APP.slotMinutes;
    else offPeakMin += APP.slotMinutes;
  }

  const lines: PriceLine[] = [];
  const push = (key: PriceLine["key"], quantity: number, unitUsd: number): void => {
    if (quantity <= 0) return;
    lines.push({ key, quantity: round2(quantity), unitUsd, amountUsd: round2(quantity * unitUsd) });
  };

  push("field", offPeakMin / 60, input.field.pricePerHourUsd);
  push("field_peak", peakMin / 60, input.field.peakPricePerHourUsd);

  const fieldTotal = lines.reduce((sum, l) => sum + l.amountUsd, 0);
  if (isWeekend(input.date) && fieldTotal > 0) {
    lines.push({ key: "weekend", quantity: 1, unitUsd: round2(fieldTotal * APP.weekendSurchargeRate), amountUsd: round2(fieldTotal * APP.weekendSurchargeRate) });
  }
  if (input.referee) push("referee", durationMin / 60, APP.refereeUsdPerHour);
  push("water", input.extras.waterBottles, APP.waterBottleUsd);
  if (input.extras.ball) push("ball", 1, APP.ballRentalUsd);
  if (input.extras.bibs) push("bibs", 1, APP.bibsRentalUsd);

  const subtotalUsd = round2(lines.reduce((sum, l) => sum + l.amountUsd, 0));
  const serviceFeeUsd = round2(subtotalUsd * APP.serviceFeeRate);
  if (serviceFeeUsd > 0) lines.push({ key: "service_fee", quantity: 1, unitUsd: serviceFeeUsd, amountUsd: serviceFeeUsd });
  const totalUsd = round2(subtotalUsd + serviceFeeUsd);

  return { lines, subtotalUsd, serviceFeeUsd, totalUsd, totalKhr: usdToKhr(totalUsd), durationMinutes: durationMin };
}
