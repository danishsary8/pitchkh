import { z } from "zod";
import { Id, Sport } from "./common";

export const SURFACES = ["artificial_turf", "natural_grass", "futsal_court", "sand", "hard_court", "clay", "parquet"] as const;
export const Surface = z.enum(SURFACES);
export const FieldStatus = z.enum(["active", "maintenance"]);

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
