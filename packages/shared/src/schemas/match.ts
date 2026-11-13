import { z } from "zod";
import { COST_SPLITS } from "../enums";
import { DateStr, Id, IsoDateTime, MatchSport, PageQuery, Province, QueryBool, SkillLevel, TimeStr } from "./common";
import { Team } from "./user";

export { COST_SPLITS };
export const CostSplit = z.enum(COST_SPLITS);
export const MatchStatus = z.enum(["open", "matched", "cancelled", "expired"]);
export const JoinStatus = z.enum(["pending", "accepted", "declined"]);

export const MatchRequest = z.object({
  id: Id,
  hostUserId: Id,
  hostTeamId: Id,
  sport: MatchSport,
  venueId: Id,
  fieldId: Id.nullable(),
  /** Set when the host already booked the field. */
  bookingId: Id.nullable(),
  date: DateStr,
  startAt: IsoDateTime,
  endAt: IsoDateTime,
  level: SkillLevel,
  teamSize: z.number().int().min(1).max(40),
  costSplit: CostSplit,
  note: z.string().max(400),
  status: MatchStatus,
  createdAt: IsoDateTime,
});

export const JoinRequest = z.object({
  id: Id,
  matchRequestId: Id,
  userId: Id,
  teamId: Id,
  message: z.string().max(300),
  status: JoinStatus,
  createdAt: IsoDateTime,
});

export const JoinRequestDetail = JoinRequest.extend({ team: Team, userName: z.string() });

export const MatchRequestDetail = MatchRequest.extend({
  venue: z.object({
    id: Id,
    slug: z.string(),
    name: z.string(),
    nameKm: z.string(),
    district: z.string(),
    province: Province,
    photo: z.string().nullable(),
  }),
  fieldName: z.string().nullable(),
  hostTeam: Team,
  hostName: z.string(),
  isHost: z.boolean(),
  /** The signed-in user's own request to join, if any. */
  myJoinRequest: JoinRequest.nullable(),
  /** Only populated for the host. */
  joinRequests: z.array(JoinRequestDetail),
  pendingCount: z.number().int(),
  /** The accepted opponent, once matched. */
  opponentTeam: Team.nullable(),
  conversationId: Id.nullable(),
});

export const MatchListQuery = PageQuery.extend({
  sport: MatchSport.optional(),
  province: Province.optional(),
  level: SkillLevel.optional(),
  date: DateStr.optional(),
  /** Only the signed-in user's hosted or joined matches. */
  mine: QueryBool.optional(),
  status: MatchStatus.optional(),
  sort: z.enum(["soonest", "newest"]).default("soonest"),
});

export const CreateMatchDto = z
  .object({
    sport: MatchSport,
    venueId: Id,
    fieldId: Id.nullable().default(null),
    bookingId: Id.nullable().default(null),
    date: DateStr,
    startTime: TimeStr,
    endTime: TimeStr,
    level: SkillLevel,
    teamSize: z.coerce.number().int().min(1).max(40),
    costSplit: CostSplit,
    note: z.string().max(400).default(""),
  })
  .refine((v) => v.startTime < v.endTime, { path: ["endTime"], message: "End time must be after start time" });

export const JoinMatchDto = z.object({ message: z.string().max(300).default("") });
export const DecideJoinDto = z.object({ decision: z.enum(["accept", "decline"]) });
