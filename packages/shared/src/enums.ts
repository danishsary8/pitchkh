/**
 * Plain enum value lists. They live apart from the zod schemas on purpose:
 * screens that only need to loop over "all sports" or "all provinces" can
 * import these without pulling the validation library into their bundle.
 * The schemas in ./schemas build their z.enum() from these same arrays.
 */

export const SPORTS = ["football", "volleyball", "tennis"] as const;
/** Opponent matching only applies to these sports. */
export const MATCH_SPORTS = ["football", "volleyball"] as const;
export const ROLES = ["player", "owner", "admin"] as const;
export const LOCALES = ["en", "km"] as const;
export const PROVINCES = ["phnom_penh", "siem_reap", "battambang", "sihanoukville", "kampot", "kampong_cham"] as const;
export const PAYMENT_METHODS = ["khqr", "aba", "wing", "cash"] as const;
export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export const AMENITIES = [
  "parking",
  "showers",
  "changing_rooms",
  "floodlights",
  "cafe",
  "wifi",
  "equipment_rental",
  "spectator_seating",
  "first_aid",
  "drinking_water",
  "air_conditioning",
  "lockers",
] as const;
export const VENUE_SORTS = ["recommended", "price_asc", "price_desc", "rating", "newest"] as const;
export const SURFACES = ["artificial_turf", "natural_grass", "futsal_court", "sand", "hard_court", "clay", "parquet"] as const;
export const COST_SPLITS = ["split", "host_pays", "loser_pays"] as const;
export const PRICE_LINE_KEYS = ["field", "field_peak", "weekend", "referee", "water", "ball", "bibs", "service_fee"] as const;
export const REPORT_REASONS = ["wrong_info", "unsafe", "no_show", "abusive", "scam", "other"] as const;
export const NOTIFICATION_TYPES = [
  "booking_confirmed",
  "booking_pending",
  "booking_rejected",
  "booking_cancelled",
  "booking_rescheduled",
  "join_request",
  "join_accepted",
  "join_declined",
  "message",
  "venue_approved",
  "venue_rejected",
  "review",
  "system",
] as const;
