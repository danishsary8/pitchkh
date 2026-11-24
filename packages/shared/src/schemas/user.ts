import { z } from "zod";
import { Id, IsoDateTime, Locale, MatchSport, Province, Role, SkillLevel } from "./common";

export const UserStatus = z.enum(["active", "suspended"]);

export const User = z.object({
  id: Id,
  role: Role,
  name: z.string().min(2).max(80),
  email: z.email(),
  phone: z.string().min(8).max(20),
  avatarUrl: z.string().nullable(),
  locale: Locale,
  status: UserStatus,
  teamId: Id.nullable(),
  homeProvince: Province,
  createdAt: IsoDateTime,
});

export const Team = z.object({
  id: Id,
  name: z.string().min(2).max(60),
  sport: MatchSport,
  captainId: Id,
  level: SkillLevel,
  memberCount: z.number().int().min(1),
  color: z.string(),
  bio: z.string().max(400),
  homeProvince: Province,
  matchesPlayed: z.number().int(),
  wins: z.number().int(),
  /** Average sportsmanship rating from opponents, 0 when unrated. */
  sportsmanship: z.number().min(0).max(5),
  sportsmanshipCount: z.number().int(),
  createdAt: IsoDateTime,
});

export const LoginDto = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const RegisterDto = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  phone: z.string().min(8).max(20),
  password: z.string().min(6).max(72),
  role: z.enum(["player", "owner"]),
});

export const RefreshDto = z.object({ refreshToken: z.string().min(1) });

/** Always answered the same way, whether or not the email has an account. */
export const ForgotPasswordDto = z.object({ email: z.email() });
export const ForgotPasswordResult = z.object({
  sent: z.literal(true),
  /** Mock mode only (there is no email): the link the email would contain. */
  demoResetUrl: z.string().optional(),
});
export const ResetPasswordDto = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(6).max(72),
});

export const AuthSession = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** When the access token expires. */
  expiresAt: IsoDateTime,
  user: User,
});

export const UpdateProfileDto = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(8).max(20).optional(),
  locale: Locale.optional(),
  homeProvince: Province.optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const UpsertTeamDto = z.object({
  name: z.string().min(2).max(60),
  sport: MatchSport,
  level: SkillLevel,
  memberCount: z.coerce.number().int().min(1).max(40),
  bio: z.string().max(400),
});
