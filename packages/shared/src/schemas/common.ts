import { z } from "zod";
import { LOCALES, MATCH_SPORTS, PAYMENT_METHODS, PROVINCES, ROLES, SKILL_LEVELS, SPORTS } from "../enums";

export { LOCALES, MATCH_SPORTS, PAYMENT_METHODS, PROVINCES, ROLES, SKILL_LEVELS, SPORTS };

export const Id = z.uuid();
/** ISO-8601 with offset, e.g. 2026-11-14T18:00:00+07:00 */
export const IsoDateTime = z.iso.datetime({ offset: true });
/** Local calendar date in Asia/Phnom_Penh, YYYY-MM-DD */
export const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
/** Local wall-clock time in Asia/Phnom_Penh, HH:mm (24:00 allowed as closing time) */
export const TimeStr = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, "Expected HH:mm");

export const Sport = z.enum(SPORTS);
export const MatchSport = z.enum(MATCH_SPORTS);

export const Role = z.enum(ROLES);

export const Locale = z.enum(LOCALES);

export const Province = z.enum(PROVINCES);

export const PaymentMethod = z.enum(PAYMENT_METHODS);

export const SkillLevel = z.enum(SKILL_LEVELS);

export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const PageMeta = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const paginated = <T extends z.ZodType>(item: T) => z.object({ data: z.array(item), meta: PageMeta });

export const ApiErrorBody = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

/** Query-string booleans arrive as "true"/"false". */
export const QueryBool = z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean());
