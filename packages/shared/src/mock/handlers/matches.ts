import { ApiError } from "../../api/errors";
import { isMatchJoinable } from "../../domain/rules";
import { toIso } from "../../domain/time";
import * as s from "../../schemas";
import type { JoinRequest, MatchRequest } from "../../types";
import { notFound, paginate, parse, type MockContext, type MockServer } from "../server";
import { getTeam, getVenue, matchDetail } from "./expand";

export function registerMatchRoutes(server: MockServer): void {
  const getMatch = (ctx: MockContext): MatchRequest => {
    const match = ctx.db.matchRequests.find((m) => m.id === ctx.params.id);
    if (!match) throw notFound("Match request");
    return match;
  };

  server.route("GET", "/matches", "public", ({ db, query, user, now }) => {
    const q = parse(s.MatchListQuery, query);
    // Open requests whose start time has passed are expired lazily on read.
    for (const m of db.matchRequests) if (m.status === "open" && Date.parse(m.startAt) <= now.getTime()) m.status = "expired";
    const mine = (m: MatchRequest): boolean => !!user && (m.hostUserId === user.id || db.joinRequests.some((j) => j.matchRequestId === m.id && j.userId === user.id));
    const rows = db.matchRequests
      .filter((m) => (q.mine ? mine(m) : m.status === (q.status ?? "open")))
      .filter((m) => !q.mine || !q.status || m.status === q.status)
      .filter((m) => !q.sport || m.sport === q.sport)
      .filter((m) => !q.level || m.level === q.level)
      .filter((m) => !q.date || m.date === q.date)
      .filter((m) => !q.province || getVenue(db, m.venueId).province === q.province)
      .sort((a, b) => (q.sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.startAt.localeCompare(b.startAt)))
      .map((m) => matchDetail(db, m, user));
    return paginate(rows, q.page, q.pageSize);
  });

  server.route("POST", "/matches", "auth", ({ db, body, requireUser, now, nowIso, newId }) => {
    const user = requireUser();
    const dto = parse(s.CreateMatchDto, body);
    if (!user.teamId) throw new ApiError(409, "conflict", "Create your team profile before posting a match.");
    const venue = getVenue(db, dto.venueId);
    if (!venue.sports.includes(dto.sport)) throw new ApiError(422, "validation_failed", "This venue does not offer that sport.", { sport: ["Not offered at this venue"] });
    const startAt = toIso(dto.date, dto.startTime);
    if (Date.parse(startAt) <= now.getTime()) throw new ApiError(422, "validation_failed", "Pick a time in the future.", { date: ["Must be in the future"] });
    const match: MatchRequest = {
      id: newId(), hostUserId: user.id, hostTeamId: user.teamId, sport: dto.sport, venueId: venue.id, fieldId: dto.fieldId, bookingId: dto.bookingId, date: dto.date,
      startAt, endAt: toIso(dto.date, dto.endTime), level: dto.level, teamSize: dto.teamSize, costSplit: dto.costSplit, note: dto.note, status: "open", createdAt: nowIso,
    };
    db.matchRequests.push(match);
    return matchDetail(db, match, user);
  });

  server.route("GET", "/matches/:id", "public", (ctx) => matchDetail(ctx.db, getMatch(ctx), ctx.user));

  server.route("POST", "/matches/:id/join", "auth", (ctx) => {
    const user = ctx.requireUser();
    const match = getMatch(ctx);
    const dto = parse(s.JoinMatchDto, ctx.body);
    if (match.hostUserId === user.id) throw new ApiError(409, "conflict", "You are hosting this match.");
    if (!isMatchJoinable(match, ctx.now)) throw new ApiError(409, "conflict", "This match is no longer open.");
    if (!user.teamId) throw new ApiError(409, "conflict", "Create your team profile before asking to join.");
    if (ctx.db.joinRequests.some((j) => j.matchRequestId === match.id && j.userId === user.id)) throw new ApiError(409, "conflict", "You already asked to join this match.");
    const join: JoinRequest = { id: ctx.newId(), matchRequestId: match.id, userId: user.id, teamId: user.teamId, message: dto.message, status: "pending", createdAt: ctx.nowIso };
    ctx.db.joinRequests.push(join);
    ctx.notify(match.hostUserId, "join_request", { team: getTeam(ctx.db, user.teamId).name }, `/matches/${match.id}`);
    return matchDetail(ctx.db, match, user);
  });

  server.route("DELETE", "/matches/:id/join", "auth", (ctx) => {
    const user = ctx.requireUser();
    const match = getMatch(ctx);
    const mine = ctx.db.joinRequests.find((j) => j.matchRequestId === match.id && j.userId === user.id);
    if (!mine) throw notFound("Join request");
    if (mine.status === "accepted") match.status = "open";
    ctx.db.joinRequests = ctx.db.joinRequests.filter((j) => j.id !== mine.id);
    return matchDetail(ctx.db, match, user);
  });

  server.route("POST", "/matches/:id/requests/:requestId/decision", "auth", (ctx) => {
    const user = ctx.requireUser();
    const match = getMatch(ctx);
    const { decision } = parse(s.DecideJoinDto, ctx.body);
    if (match.hostUserId !== user.id) throw new ApiError(403, "forbidden", "Only the host can answer join requests.");
    const join = ctx.db.joinRequests.find((j) => j.id === ctx.params.requestId && j.matchRequestId === match.id);
    if (!join) throw notFound("Join request");
    if (join.status !== "pending") throw new ApiError(409, "conflict", "This request was already answered.");
    const hostTeam = getTeam(ctx.db, match.hostTeamId);

    if (decision === "decline") {
      join.status = "declined";
      ctx.notify(join.userId, "join_declined", { team: hostTeam.name }, `/matches/${match.id}`);
      return matchDetail(ctx.db, match, user);
    }
    if (match.status !== "open") throw new ApiError(409, "conflict", "This match is no longer open.");
    join.status = "accepted";
    match.status = "matched";
    // Accepting one team declines everyone else and opens a chat thread.
    for (const other of ctx.db.joinRequests) {
      if (other.matchRequestId === match.id && other.id !== join.id && other.status === "pending") {
        other.status = "declined";
        ctx.notify(other.userId, "join_declined", { team: hostTeam.name }, `/matches/${match.id}`);
      }
    }
    const opponent = getTeam(ctx.db, join.teamId);
    ctx.db.conversations.push({ id: ctx.newId(), kind: "match", title: `${hostTeam.name} vs ${opponent.name}`, matchRequestId: match.id, participantIds: [user.id, join.userId], readAt: { [user.id]: ctx.nowIso }, createdAt: ctx.nowIso });
    ctx.notify(join.userId, "join_accepted", { team: hostTeam.name }, `/matches/${match.id}`);
    return matchDetail(ctx.db, match, user);
  });

  server.route("POST", "/matches/:id/cancel", "auth", (ctx) => {
    const user = ctx.requireUser();
    const match = getMatch(ctx);
    if (match.hostUserId !== user.id) throw new ApiError(403, "forbidden", "Only the host can cancel this match.");
    match.status = "cancelled";
    return matchDetail(ctx.db, match, user);
  });
}
