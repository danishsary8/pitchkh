/**
 * v1.1 on the real API: teams, the match board, chat and reviews.
 * Twins of packages/shared/src/mock/handlers/{matches,social,auth}.ts.
 */
import { ApiError, isMatchJoinable, schemas as s, toIso, type MatchRequest, type Team, type User } from "@pitchkh/shared";
import { conversationOut, messageOut, notFound, paginate, parse, reviewOut, type ConversationRow, type MockDb } from "@pitchkh/shared/mock";
import { and, arrayContains, desc, eq, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import type { Tx } from "../db/client";
import { toConversationRow, toMatch, toMessageRow, toReviewRow, toTeam, toUser, toVenue } from "../db/mappers";
import * as t from "../db/schema";
import type { Ctx, Route } from "../http";
import { emptySnapshot, findVenue, matchDetails } from "../views";

const isId = (v: string | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

async function teamOf(tx: Tx, id: string): Promise<Team> {
  const [row] = await tx.select().from(t.teams).where(eq(t.teams.id, id));
  if (!row) throw notFound("Team");
  return toTeam(row);
}

/** A team for a player who has none yet (used by "Find me an opponent"). */
export async function ensureTeam(tx: Tx, user: User, sport: "football" | "volleyball", level: Team["level"], memberCount: number, now: Date, newId: () => string): Promise<string> {
  if (user.teamId) return user.teamId;
  const id = newId();
  await tx.insert(t.teams).values({
    id, name: `${user.name.split(" ").pop() ?? user.name}'s team`, sport, captainId: user.id, level, memberCount, color: "#0B7A4B", bio: "",
    homeProvince: user.homeProvince, matchesPlayed: 0, wins: 0, sportsmanship: 0, sportsmanshipCount: 0, createdAt: now,
  });
  await tx.update(t.users).set({ teamId: id }).where(eq(t.users.id, user.id));
  return id;
}

/** Average rating and count for a venue or team, kept on the row like the mock's recomputeRatings. */
async function recomputeRating(tx: Tx, targetType: "venue" | "team", targetId: string): Promise<void> {
  const [agg] = await tx
    .select({ avg: sql<string | null>`round(avg(${t.reviews.rating})::numeric, 1)`, count: sql<number>`count(*)::int` })
    .from(t.reviews)
    .where(and(eq(t.reviews.targetType, targetType), eq(t.reviews.targetId, targetId)));
  const rating = Number(agg?.avg ?? 0);
  const count = agg?.count ?? 0;
  if (targetType === "venue") await tx.update(t.venues).set({ rating, reviewCount: count }).where(eq(t.venues.id, targetId));
  else await tx.update(t.teams).set({ sportsmanship: rating, sportsmanshipCount: count }).where(eq(t.teams.id, targetId));
}

/** Rows the shared review/chat joins need: names of users, venues and teams. */
async function namesSnapshot(tx: Tx, userIds: string[], venueIds: string[] = [], teamIds: string[] = []): Promise<MockDb> {
  const snap = emptySnapshot();
  if (userIds.length) snap.users = (await tx.select().from(t.users).where(inArray(t.users.id, [...new Set(userIds)]))).map(toUser);
  if (venueIds.length) snap.venues = (await tx.select().from(t.venues).where(inArray(t.venues.id, [...new Set(venueIds)]))).map(toVenue);
  if (teamIds.length) snap.teams = (await tx.select().from(t.teams).where(inArray(t.teams.id, [...new Set(teamIds)]))).map(toTeam);
  return snap;
}

export function registerSocialRoutes(route: Route): void {
  /* -------------------------------- teams ------------------------------- */
  route("GET", "/me/team", "auth", async ({ db, requireUser }) => {
    const user = requireUser();
    return user.teamId ? teamOf(db, user.teamId) : null;
  });

  route("PUT", "/me/team", "auth", async ({ db, requireUser, body, now, newId }) => {
    const user = requireUser();
    const dto = parse(s.UpsertTeamDto, body);
    return db.transaction(async (tx) => {
      if (user.teamId) {
        const [row] = await tx.update(t.teams).set(dto).where(eq(t.teams.id, user.teamId)).returning();
        if (row) return toTeam(row);
      }
      const id = newId();
      const [row] = await tx.insert(t.teams).values({ id, ...dto, captainId: user.id, color: "#0B7A4B", homeProvince: user.homeProvince, matchesPlayed: 0, wins: 0, sportsmanship: 0, sportsmanshipCount: 0, createdAt: now }).returning();
      await tx.update(t.users).set({ teamId: id }).where(eq(t.users.id, user.id));
      return toTeam(row as typeof t.teams.$inferSelect);
    });
  });

  route("GET", "/teams/:id", "public", async ({ db, params }) => {
    if (!isId(params.id)) throw notFound("Team");
    const team = await teamOf(db, params.id);
    const rows = (await db.select().from(t.reviews).where(and(eq(t.reviews.targetType, "team"), eq(t.reviews.targetId, team.id))).orderBy(desc(t.reviews.createdAt))).map(toReviewRow);
    const snap = await namesSnapshot(db, [team.captainId, ...rows.map((r) => r.authorId)], [], [team.id]);
    return { team, captainName: snap.users.find((u) => u.id === team.captainId)?.name ?? "", reviews: rows.map((r) => reviewOut(snap, r)) };
  });

  /* ------------------------------- matches ------------------------------ */
  const getMatch = async (tx: Tx, id: string | undefined, lock = false): Promise<MatchRequest> => {
    if (!isId(id)) throw notFound("Match request");
    const query = tx.select().from(t.matchRequests).where(eq(t.matchRequests.id, id));
    const [row] = lock ? await query.for("update") : await query;
    if (!row) throw notFound("Match request");
    return toMatch(row);
  };
  const detail = async (tx: Tx, match: MatchRequest, user: User | null) => (await matchDetails(tx, [match], user))[0];

  route("GET", "/matches", "public", async ({ db, query, user, now }) => {
    const q = parse(s.MatchListQuery, query);
    // Open requests whose start time has passed expire (lazily, like the mock).
    await db.update(t.matchRequests).set({ status: "expired" }).where(and(eq(t.matchRequests.status, "open"), lte(t.matchRequests.startAt, now)));
    const where: SQL[] = [];
    if (q.mine) {
      if (!user) return paginate([], q.page, q.pageSize);
      const joined = db.select({ id: t.joinRequests.matchRequestId }).from(t.joinRequests).where(eq(t.joinRequests.userId, user.id));
      where.push(or(eq(t.matchRequests.hostUserId, user.id), inArray(t.matchRequests.id, joined)) as SQL);
      if (q.status) where.push(eq(t.matchRequests.status, q.status));
    } else where.push(eq(t.matchRequests.status, q.status ?? "open"));
    if (q.sport) where.push(eq(t.matchRequests.sport, q.sport));
    if (q.level) where.push(eq(t.matchRequests.level, q.level));
    if (q.date) where.push(eq(t.matchRequests.date, q.date));
    if (q.province) where.push(inArray(t.matchRequests.venueId, db.select({ id: t.venues.id }).from(t.venues).where(eq(t.venues.province, q.province))));
    const rows = (await db.select().from(t.matchRequests).where(and(...where)).orderBy(q.sort === "newest" ? desc(t.matchRequests.createdAt) : t.matchRequests.startAt)).map(toMatch);
    const page = paginate(rows, q.page, q.pageSize);
    return { ...page, data: await matchDetails(db, page.data, user) };
  });

  route("POST", "/matches", "auth", async ({ db, body, requireUser, now, newId }) => {
    const user = requireUser();
    const dto = parse(s.CreateMatchDto, body);
    if (!user.teamId) throw new ApiError(409, "conflict", "Create your team profile before posting a match.");
    const venue = await findVenue(db, dto.venueId);
    if (!venue.sports.includes(dto.sport)) throw new ApiError(422, "validation_failed", "This venue does not offer that sport.", { sport: ["Not offered at this venue"] });
    const startAt = new Date(toIso(dto.date, dto.startTime));
    if (startAt <= now) throw new ApiError(422, "validation_failed", "Pick a time in the future.", { date: ["Must be in the future"] });
    const [row] = await db.insert(t.matchRequests).values({
      id: newId(), hostUserId: user.id, hostTeamId: user.teamId, sport: dto.sport, venueId: venue.id, fieldId: dto.fieldId, bookingId: dto.bookingId, date: dto.date,
      startAt, endAt: new Date(toIso(dto.date, dto.endTime)), level: dto.level, teamSize: dto.teamSize, costSplit: dto.costSplit, note: dto.note, status: "open", createdAt: now,
    }).returning();
    return detail(db, toMatch(row as typeof t.matchRequests.$inferSelect), user);
  });

  route("GET", "/matches/:id", "public", async ({ db, params, user }) => detail(db, await getMatch(db, params.id), user));

  route("POST", "/matches/:id/join", "auth", async (ctx) => {
    const user = ctx.requireUser();
    const dto = parse(s.JoinMatchDto, ctx.body);
    return ctx.db.transaction(async (tx) => {
      const match = await getMatch(tx, ctx.params.id, true);
      if (match.hostUserId === user.id) throw new ApiError(409, "conflict", "You are hosting this match.");
      if (!isMatchJoinable(match, ctx.now)) throw new ApiError(409, "conflict", "This match is no longer open.");
      if (!user.teamId) throw new ApiError(409, "conflict", "Create your team profile before asking to join.");
      const [existing] = await tx.select({ id: t.joinRequests.id }).from(t.joinRequests).where(and(eq(t.joinRequests.matchRequestId, match.id), eq(t.joinRequests.userId, user.id)));
      if (existing) throw new ApiError(409, "conflict", "You already asked to join this match.");
      await tx.insert(t.joinRequests).values({ id: ctx.newId(), matchRequestId: match.id, userId: user.id, teamId: user.teamId, message: dto.message, status: "pending", createdAt: ctx.now });
      await ctx.notify(tx, match.hostUserId, "join_request", { team: (await teamOf(tx, user.teamId)).name }, `/matches/${match.id}`);
      return detail(tx, match, user);
    });
  });

  route("DELETE", "/matches/:id/join", "auth", async (ctx) => {
    const user = ctx.requireUser();
    return ctx.db.transaction(async (tx) => {
      const match = await getMatch(tx, ctx.params.id, true);
      const [mine] = await tx.delete(t.joinRequests).where(and(eq(t.joinRequests.matchRequestId, match.id), eq(t.joinRequests.userId, user.id))).returning();
      if (!mine) throw notFound("Join request");
      if (mine.status === "accepted") await tx.update(t.matchRequests).set({ status: "open" }).where(eq(t.matchRequests.id, match.id));
      return detail(tx, await getMatch(tx, match.id), user);
    });
  });

  route("POST", "/matches/:id/requests/:requestId/decision", "auth", async (ctx) => {
    const user = ctx.requireUser();
    const { decision } = parse(s.DecideJoinDto, ctx.body);
    return ctx.db.transaction(async (tx) => {
      // Locking the match means two "accept" taps can't match two teams.
      const match = await getMatch(tx, ctx.params.id, true);
      if (match.hostUserId !== user.id) throw new ApiError(403, "forbidden", "Only the host can answer join requests.");
      if (!isId(ctx.params.requestId)) throw notFound("Join request");
      const [join] = await tx.select().from(t.joinRequests).where(and(eq(t.joinRequests.id, ctx.params.requestId), eq(t.joinRequests.matchRequestId, match.id)));
      if (!join) throw notFound("Join request");
      if (join.status !== "pending") throw new ApiError(409, "conflict", "This request was already answered.");
      const hostTeam = await teamOf(tx, match.hostTeamId);
      if (decision === "decline") {
        await tx.update(t.joinRequests).set({ status: "declined" }).where(eq(t.joinRequests.id, join.id));
        await ctx.notify(tx, join.userId, "join_declined", { team: hostTeam.name }, `/matches/${match.id}`);
        return detail(tx, match, user);
      }
      if (match.status !== "open") throw new ApiError(409, "conflict", "This match is no longer open.");
      await tx.update(t.joinRequests).set({ status: "accepted" }).where(eq(t.joinRequests.id, join.id));
      await tx.update(t.matchRequests).set({ status: "matched" }).where(eq(t.matchRequests.id, match.id));
      // Accepting one team declines everyone else and opens a chat thread.
      const others = await tx.update(t.joinRequests).set({ status: "declined" }).where(and(eq(t.joinRequests.matchRequestId, match.id), ne(t.joinRequests.id, join.id), eq(t.joinRequests.status, "pending"))).returning();
      for (const other of others) await ctx.notify(tx, other.userId, "join_declined", { team: hostTeam.name }, `/matches/${match.id}`);
      const opponent = await teamOf(tx, join.teamId);
      await tx.insert(t.conversations).values({ id: ctx.newId(), kind: "match", title: `${hostTeam.name} vs ${opponent.name}`, matchRequestId: match.id, participantIds: [user.id, join.userId], readAt: { [user.id]: ctx.nowIso }, createdAt: ctx.now });
      await ctx.notify(tx, join.userId, "join_accepted", { team: hostTeam.name }, `/matches/${match.id}`);
      return detail(tx, await getMatch(tx, match.id), user);
    });
  });

  route("POST", "/matches/:id/cancel", "auth", async ({ db, params, requireUser }) => {
    const user = requireUser();
    const match = await getMatch(db, params.id);
    if (match.hostUserId !== user.id) throw new ApiError(403, "forbidden", "Only the host can cancel this match.");
    await db.update(t.matchRequests).set({ status: "cancelled" }).where(eq(t.matchRequests.id, match.id));
    return detail(db, { ...match, status: "cancelled" }, user);
  });

  /* --------------------------------- chat ------------------------------- */
  const getThread = async (ctx: Ctx, tx: Tx = ctx.db): Promise<ConversationRow> => {
    const user = ctx.requireUser();
    if (!isId(ctx.params.id)) throw notFound("Conversation");
    const [row] = await tx.select().from(t.conversations).where(eq(t.conversations.id, ctx.params.id));
    if (!row) throw notFound("Conversation");
    if (!row.participantIds.includes(user.id)) throw new ApiError(403, "forbidden", "You are not part of this conversation.");
    return toConversationRow(row);
  };
  /** Threads with their messages and participant names, through the shared joins. */
  const threadsOut = async (tx: Tx, threads: ConversationRow[], user: User, withMessages: boolean) => {
    const snap = await namesSnapshot(tx, threads.flatMap((c) => c.participantIds));
    snap.conversations = threads;
    if (threads.length) snap.messages = (await tx.select().from(t.messages).where(inArray(t.messages.conversationId, threads.map((c) => c.id)))).map(toMessageRow);
    return threads.map((c) => ({
      ...conversationOut(snap, c, user),
      ...(withMessages
        ? {
            messages: snap.messages.filter((m) => m.conversationId === c.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((m) => messageOut(snap, m)),
            participants: c.participantIds.map((id) => ({ id, name: snap.users.find((u) => u.id === id)?.name ?? "Deleted user" })),
          }
        : {}),
    }));
  };

  route("GET", "/conversations", "auth", async ({ db, requireUser }) => {
    const user = requireUser();
    const threads = (await db.select().from(t.conversations).where(arrayContains(t.conversations.participantIds, [user.id]))).map(toConversationRow);
    return (await threadsOut(db, threads, user, false)).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  });

  // Starts (or reuses) a player <-> venue owner thread.
  route("POST", "/conversations", "auth", async (ctx) => {
    const user = ctx.requireUser();
    const { venueId } = parse(s.StartConversationDto, ctx.body);
    const venue = await findVenue(ctx.db, venueId);
    let [row] = await ctx.db.select().from(t.conversations).where(and(eq(t.conversations.kind, "venue"), eq(t.conversations.title, venue.name), arrayContains(t.conversations.participantIds, [user.id])));
    if (!row) [row] = await ctx.db.insert(t.conversations).values({ id: ctx.newId(), kind: "venue", title: venue.name, matchRequestId: null, participantIds: [user.id, venue.ownerId], readAt: { [user.id]: ctx.nowIso }, createdAt: ctx.now }).returning();
    return (await threadsOut(ctx.db, [toConversationRow(row as typeof t.conversations.$inferSelect)], user, true))[0];
  });

  route("GET", "/conversations/:id", "auth", async (ctx) => (await threadsOut(ctx.db, [await getThread(ctx)], ctx.requireUser(), true))[0]);

  route("POST", "/conversations/:id/messages", "auth", async (ctx) => {
    const user = ctx.requireUser();
    const thread = await getThread(ctx);
    const { body } = parse(s.SendMessageDto, ctx.body);
    return ctx.db.transaction(async (tx) => {
      const [row] = await tx.insert(t.messages).values({ id: ctx.newId(), conversationId: thread.id, senderId: user.id, body, createdAt: ctx.now }).returning();
      await tx.update(t.conversations).set({ readAt: sql`${t.conversations.readAt} || ${JSON.stringify({ [user.id]: ctx.nowIso })}::jsonb` }).where(eq(t.conversations.id, thread.id));
      for (const id of thread.participantIds) if (id !== user.id) await ctx.notify(tx, id, "message", { from: user.name }, `/account/messages/${thread.id}`);
      const snap = await namesSnapshot(tx, [user.id]);
      return messageOut(snap, toMessageRow(row as typeof t.messages.$inferSelect));
    });
  });

  route("POST", "/conversations/:id/read", "auth", async (ctx) => {
    const thread = await getThread(ctx);
    await ctx.db.update(t.conversations).set({ readAt: sql`${t.conversations.readAt} || ${JSON.stringify({ [ctx.requireUser().id]: ctx.nowIso })}::jsonb` }).where(eq(t.conversations.id, thread.id));
    return undefined;
  });

  /* ------------------------------- reviews ------------------------------ */
  route("GET", "/reviews", "public", async ({ db, query }) => {
    const q = parse(s.ReviewListQuery, query);
    const where: SQL[] = [];
    if (q.targetType) where.push(eq(t.reviews.targetType, q.targetType));
    if (q.targetId) where.push(eq(t.reviews.targetId, q.targetId));
    if (q.authorId) where.push(eq(t.reviews.authorId, q.authorId));
    const rows = (await db.select().from(t.reviews).where(where.length ? and(...where) : undefined).orderBy(desc(t.reviews.createdAt))).map(toReviewRow);
    const page = paginate(rows, q.page, q.pageSize);
    const snap = await namesSnapshot(db, page.data.map((r) => r.authorId), page.data.filter((r) => r.targetType === "venue").map((r) => r.targetId), page.data.filter((r) => r.targetType === "team").map((r) => r.targetId));
    return { ...page, data: page.data.map((r) => reviewOut(snap, r)) };
  });

  route("POST", "/reviews", "auth", async (ctx) => {
    const user = ctx.requireUser();
    const dto = parse(s.CreateReviewDto, ctx.body);
    return ctx.db.transaction(async (tx) => {
      let ownerId: string | null = null;
      let venueName = "";
      if (dto.targetType === "venue") {
        const venue = await findVenue(tx, dto.targetId);
        ownerId = venue.ownerId;
        venueName = venue.name;
      } else if ((await teamOf(tx, dto.targetId)).captainId === user.id) throw new ApiError(409, "conflict", "You cannot rate your own team.");
      if (dto.bookingId) {
        const [b] = await tx.select({ userId: t.bookings.userId }).from(t.bookings).where(eq(t.bookings.id, dto.bookingId));
        if (!b || b.userId !== user.id) throw new ApiError(403, "forbidden", "You can only review your own bookings.");
        const [dup] = await tx.select({ id: t.reviews.id }).from(t.reviews).where(and(eq(t.reviews.bookingId, dto.bookingId), eq(t.reviews.authorId, user.id), eq(t.reviews.targetType, dto.targetType)));
        if (dup) throw new ApiError(409, "conflict", "You already reviewed this booking.");
      }
      const [row] = await tx.insert(t.reviews).values({ id: ctx.newId(), ...dto, authorId: user.id, createdAt: ctx.now }).returning();
      await recomputeRating(tx, dto.targetType, dto.targetId);
      if (ownerId) await ctx.notify(tx, ownerId, "review", { venue: venueName }, "/owner");
      const snap = await namesSnapshot(tx, [user.id], dto.targetType === "venue" ? [dto.targetId] : [], dto.targetType === "team" ? [dto.targetId] : []);
      return reviewOut(snap, toReviewRow(row as typeof t.reviews.$inferSelect));
    });
  });
}
