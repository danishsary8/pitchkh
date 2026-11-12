import { z } from "zod";
import { DateStr, Id, IsoDateTime, PageQuery, PaymentMethod, SkillLevel, Sport, TimeStr } from "./common";

export const Extras = z.object({
  waterBottles: z.number().int().min(0).max(48),
  ball: z.boolean(),
  bibs: z.boolean(),
});

export const PRICE_LINE_KEYS = ["field", "field_peak", "weekend", "referee", "water", "ball", "bibs", "service_fee"] as const;
export const PriceLine = z.object({
  key: z.enum(PRICE_LINE_KEYS),
  /** Hours for field/referee lines, units for extras. */
  quantity: z.number(),
  unitUsd: z.number(),
  amountUsd: z.number(),
});

export const PriceBreakdown = z.object({
  lines: z.array(PriceLine),
  subtotalUsd: z.number(),
  serviceFeeUsd: z.number(),
  totalUsd: z.number(),
  totalKhr: z.number().int(),
  durationMinutes: z.number().int(),
});

export const BookingStatus = z.enum(["pending", "confirmed", "rejected", "cancelled", "completed"]);
export const PaymentStatus = z.enum(["unpaid", "paid", "refunded"]);
export const OpponentMode = z.enum(["have", "find"]);

export const Booking = z.object({
  id: Id,
  /** Human-friendly reference shown on receipts, e.g. PK-7F3K2Q */
  code: z.string(),
  userId: Id,
  venueId: Id,
  fieldId: Id,
  sport: Sport,
  date: DateStr,
  startAt: IsoDateTime,
  endAt: IsoDateTime,
  teamSize: z.number().int().min(1).max(40),
  referee: z.boolean(),
  extras: Extras,
  notes: z.string().max(500),
  opponentMode: OpponentMode,
  matchRequestId: Id.nullable(),
  price: PriceBreakdown,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
  status: BookingStatus,
  createdAt: IsoDateTime,
  cancelledAt: IsoDateTime.nullable(),
});

/** Booking with the venue/field/customer info screens need, to avoid N+1 calls. */
export const BookingDetail = Booking.extend({
  venue: z.object({
    id: Id,
    slug: z.string(),
    name: z.string(),
    nameKm: z.string(),
    district: z.string(),
    province: z.string(),
    address: z.string(),
    photo: z.string().nullable(),
    phone: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
  field: z.object({ id: Id, name: z.string(), position: z.string(), format: z.string() }),
  customer: z.object({ id: Id, name: z.string(), phone: z.string() }),
  canCancel: z.boolean(),
  canReschedule: z.boolean(),
  reviewed: z.boolean(),
});

export const CreateBookingDto = z
  .object({
    fieldId: Id,
    date: DateStr,
    startTime: TimeStr,
    endTime: TimeStr,
    teamSize: z.coerce.number().int().min(1).max(40),
    referee: z.boolean(),
    extras: Extras,
    notes: z.string().max(500).default(""),
    opponentMode: OpponentMode,
    /** Only used when opponentMode = "find". */
    matchLevel: SkillLevel.optional(),
    paymentMethod: PaymentMethod,
  })
  .refine((v) => v.startTime < v.endTime, { path: ["endTime"], message: "End time must be after start time" });

export const QuoteDto = z.object({
  fieldId: Id,
  date: DateStr,
  startTime: TimeStr,
  endTime: TimeStr,
  referee: z.boolean(),
  extras: Extras,
});

export const RescheduleBookingDto = z
  .object({ date: DateStr, startTime: TimeStr, endTime: TimeStr })
  .refine((v) => v.startTime < v.endTime, { path: ["endTime"], message: "End time must be after start time" });

export const BookingListQuery = PageQuery.extend({
  scope: z.enum(["upcoming", "past", "all"]).default("all"),
  status: BookingStatus.optional(),
});

export const OwnerBookingListQuery = BookingListQuery.extend({
  venueId: Id.optional(),
  date: DateStr.optional(),
});

export const DecideBookingDto = z.object({ decision: z.enum(["accept", "reject"]) });

export const SlotStatus = z.enum(["available", "booked", "blocked", "past"]);
export const Slot = z.object({
  start: TimeStr,
  end: TimeStr,
  startAt: IsoDateTime,
  endAt: IsoDateTime,
  status: SlotStatus,
  priceUsd: z.number(),
  peak: z.boolean(),
});

export const AvailabilityQuery = z.object({ date: DateStr });
export const Availability = z.object({
  fieldId: Id,
  date: DateStr,
  closed: z.boolean(),
  open: TimeStr,
  close: TimeStr,
  slots: z.array(Slot),
});

export const AvailabilityBlock = z.object({
  id: Id,
  fieldId: Id,
  date: DateStr,
  startTime: TimeStr,
  endTime: TimeStr,
  reason: z.string().max(120),
});

export const CreateBlockDto = z
  .object({
    fieldId: Id,
    date: DateStr,
    startTime: TimeStr,
    endTime: TimeStr,
    reason: z.string().max(120).default(""),
  })
  .refine((v) => v.startTime < v.endTime, { path: ["endTime"], message: "End time must be after start time" });
