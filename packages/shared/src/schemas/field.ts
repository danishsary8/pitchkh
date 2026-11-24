import { z } from "zod";
import { SURFACES } from "../enums";
import { Id, Sport } from "./common";

export { SURFACES };

export const Surface = z.enum(SURFACES);
export const FieldStatus = z.enum(["active", "maintenance"]);

/**
 * Where a pitch sits on the venue's top-down plan, in metres from the plan's
 * top-left corner. The longer side is the pitch length; h > w means it is
 * drawn vertically. null means "not placed yet" (the app auto-arranges it).
 */
export const PLAN_MAX_METRES = 400;
const metres = z.number().min(0).max(PLAN_MAX_METRES);
export const FieldLayout = z
  .object({ x: metres, y: metres, w: z.number().min(4).max(PLAN_MAX_METRES), h: z.number().min(4).max(PLAN_MAX_METRES) })
  .refine((l) => l.x + l.w <= PLAN_MAX_METRES && l.y + l.h <= PLAN_MAX_METRES, { message: "outside_plan" });

export const Field = z.object({
  id: Id,
  venueId: Id,
  sport: Sport,
  /** e.g. "Field A" */
  name: z.string().min(1).max(40),
  /** Where it sits in the venue, e.g. "Indoor, north hall" */
  position: z.string().max(60),
  surface: Surface,
  indoor: z.boolean(),
  /** e.g. "5v5", "7v7", "11v11", "6v6", "Singles/Doubles" */
  format: z.string().max(20),
  maxPlayers: z.number().int().min(2).max(40),
  pricePerHourUsd: z.number().min(0),
  /** Rate between APP.peakStart and APP.peakEnd. */
  peakPricePerHourUsd: z.number().min(0),
  lit: z.boolean(),
  status: FieldStatus,
  layout: FieldLayout.nullable(),
});

export const SaveLayoutDto = z.object({
  items: z.array(z.object({ fieldId: Id, layout: FieldLayout })).min(1).max(60),
});

export const UpsertFieldDto = z.object({
  sport: Sport,
  name: z.string().min(1).max(40),
  position: z.string().max(60).default(""),
  surface: Surface,
  indoor: z.boolean(),
  format: z.string().min(1).max(20),
  maxPlayers: z.coerce.number().int().min(2).max(40),
  pricePerHourUsd: z.coerce.number().min(1).max(500),
  peakPricePerHourUsd: z.coerce.number().min(1).max(500),
  lit: z.boolean(),
  status: FieldStatus.default("active"),
});
