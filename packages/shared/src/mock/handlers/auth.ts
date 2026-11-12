import { ApiError } from "../../api/errors";
import * as s from "../../schemas";
import type { AuthSession, Team, User } from "../../types";
import { accessExpiry, makeAccessToken, makeRefreshToken, notFound, parse, type MockServer } from "../server";
import { getTeam, reviewOut } from "./expand";

export function registerAuthRoutes(server: MockServer): void {
  const session = (user: User, now: Date): AuthSession => ({ accessToken: makeAccessToken(user.id, now), refreshToken: makeRefreshToken(user.id), expiresAt: accessExpiry(now), user });

  server.route("POST", "/auth/login", "public", ({ db, body, now }) => {
    const dto = parse(s.LoginDto, body);
    const user = db.users.find((u) => u.email.toLowerCase() === dto.email.toLowerCase());
    if (!user || db.passwords[user.id] !== dto.password) throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
    if (user.status === "suspended") throw new ApiError(403, "account_suspended", "This account is suspended.");
    return session(user, now);
  });

  server.route("POST", "/auth/register", "public", ({ db, body, now, nowIso, newId }) => {
    const dto = parse(s.RegisterDto, body);
    if (db.users.some((u) => u.email.toLowerCase() === dto.email.toLowerCase())) {
      throw new ApiError(409, "email_taken", "An account with this email already exists.", { email: ["Already registered"] });
    }
    const user: User = { id: newId(), role: dto.role, name: dto.name, email: dto.email, phone: dto.phone, avatarUrl: null, locale: "en", status: "active", teamId: null, homeProvince: "phnom_penh", createdAt: nowIso };
    db.users.push(user);
    db.passwords[user.id] = dto.password;
    return session(user, now);
  });

  server.route("POST", "/auth/refresh", "public", ({ db, body, now }) => {
    const { refreshToken } = parse(s.RefreshDto, body);
    const [kind, userId] = refreshToken.split(".");
    const user = db.users.find((u) => u.id === userId);
    if (kind !== "mock-refresh" || !user) throw new ApiError(401, "unauthorized", "Session expired. Sign in again.");
    return session(user, now);
  });

  server.route("POST", "/auth/logout", "public", () => undefined);

  server.route("GET", "/auth/me", "auth", ({ requireUser }) => requireUser());

  server.route("PATCH", "/auth/me", "auth", ({ requireUser, body }) => {
    const user = requireUser();
    Object.assign(user, parse(s.UpdateProfileDto, body));
    return user;
  });

  server.route("GET", "/me/team", "auth", ({ db, requireUser }) => {
    const user = requireUser();
    return user.teamId ? getTeam(db, user.teamId) : null;
  });

  server.route("PUT", "/me/team", "auth", ({ db, requireUser, body, nowIso, newId }) => {
    const user = requireUser();
    const dto = parse(s.UpsertTeamDto, body);
    const existing = user.teamId ? db.teams.find((t) => t.id === user.teamId) : undefined;
    if (existing) return Object.assign(existing, dto);
    const team: Team = { id: newId(), ...dto, captainId: user.id, color: "#0B7A4B", homeProvince: user.homeProvince, matchesPlayed: 0, wins: 0, sportsmanship: 0, sportsmanshipCount: 0, createdAt: nowIso };
    db.teams.push(team);
    user.teamId = team.id;
    return team;
  });

  server.route("GET", "/teams/:id", "public", ({ db, params }) => {
    const team = db.teams.find((t) => t.id === params.id);
    if (!team) throw notFound("Team");
    const reviews = db.reviews.filter((r) => r.targetType === "team" && r.targetId === team.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => reviewOut(db, r));
    return { team, captainName: db.users.find((u) => u.id === team.captainId)?.name ?? "", reviews };
  });
}
