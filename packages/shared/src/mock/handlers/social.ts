import { ApiError } from "../../api/errors";
import * as s from "../../schemas";
import type { ConversationDetail } from "../../types";
import type { ConversationRow } from "../db";
import { recomputeRatings } from "../seed";
import { notFound, paginate, parse, type MockContext, type MockServer } from "../server";
import { conversationOut, getVenue, messageOut, reviewOut, userName } from "./expand";

export function registerSocialRoutes(server: MockServer): void {
  /* ------------------------------- chat ------------------------------- */
  const getThread = (ctx: MockContext): ConversationRow => {
    const user = ctx.requireUser();
    const thread = ctx.db.conversations.find((c) => c.id === ctx.params.id);
    if (!thread) throw notFound("Conversation");
    if (!thread.participantIds.includes(user.id)) throw new ApiError(403, "forbidden", "You are not part of this conversation.");
    return thread;
  };
  const detail = (ctx: MockContext, thread: ConversationRow): ConversationDetail => ({
    ...conversationOut(ctx.db, thread, ctx.requireUser()),
    messages: ctx.db.messages.filter((m) => m.conversationId === thread.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((m) => messageOut(ctx.db, m)),
    participants: thread.participantIds.map((id) => ({ id, name: userName(ctx.db, id) })),
  });

  server.route("GET", "/conversations", "auth", ({ db, requireUser }) => {
    const user = requireUser();
    return db.conversations.filter((c) => c.participantIds.includes(user.id)).map((c) => conversationOut(db, c, user)).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  });

  // Starts (or reuses) a player <-> venue owner thread.
  server.route("POST", "/conversations", "auth", (ctx) => {
    const user = ctx.requireUser();
    const { venueId } = parse(s.StartConversationDto, ctx.body);
    const venue = getVenue(ctx.db, venueId);
    let thread = ctx.db.conversations.find((c) => c.kind === "venue" && c.title === venue.name && c.participantIds.includes(user.id));
    if (!thread) {
      thread = { id: ctx.newId(), kind: "venue", title: venue.name, matchRequestId: null, participantIds: [user.id, venue.ownerId], readAt: { [user.id]: ctx.nowIso }, createdAt: ctx.nowIso };
      ctx.db.conversations.push(thread);
    }
    return detail(ctx, thread);
  });

  server.route("GET", "/conversations/:id", "auth", (ctx) => detail(ctx, getThread(ctx)));

  server.route("POST", "/conversations/:id/messages", "auth", (ctx) => {
    const user = ctx.requireUser();
    const thread = getThread(ctx);
    const { body } = parse(s.SendMessageDto, ctx.body);
    const row = { id: ctx.newId(), conversationId: thread.id, senderId: user.id, body, createdAt: ctx.nowIso };
    ctx.db.messages.push(row);
    thread.readAt[user.id] = ctx.nowIso;
    for (const id of thread.participantIds) if (id !== user.id) ctx.notify(id, "message", { from: user.name }, `/account/messages/${thread.id}`);
    return messageOut(ctx.db, row);
  });

  server.route("POST", "/conversations/:id/read", "auth", (ctx) => {
    const thread = getThread(ctx);
    thread.readAt[ctx.requireUser().id] = ctx.nowIso;
    return undefined;
  });

  /* ------------------------------ reviews ----------------------------- */
  server.route("GET", "/reviews", "public", ({ db, query }) => {
    const q = parse(s.ReviewListQuery, query);
    const rows = db.reviews
      .filter((r) => !q.targetType || r.targetType === q.targetType)
      .filter((r) => !q.targetId || r.targetId === q.targetId)
      .filter((r) => !q.authorId || r.authorId === q.authorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => reviewOut(db, r));
    return paginate(rows, q.page, q.pageSize);
  });

  server.route("POST", "/reviews", "auth", ({ db, body, requireUser, nowIso, newId, notify }) => {
    const user = requireUser();
    const dto = parse(s.CreateReviewDto, body);
    const exists = dto.targetType === "venue" ? db.venues.some((v) => v.id === dto.targetId) : db.teams.some((t) => t.id === dto.targetId);
    if (!exists) throw notFound(dto.targetType === "venue" ? "Venue" : "Team");
    if (dto.bookingId && db.reviews.some((r) => r.bookingId === dto.bookingId && r.authorId === user.id && r.targetType === dto.targetType)) {
      throw new ApiError(409, "conflict", "You already reviewed this booking.");
    }
    if (dto.targetType === "team" && db.teams.find((t) => t.id === dto.targetId)?.captainId === user.id) throw new ApiError(409, "conflict", "You cannot rate your own team.");
    const row = { id: newId(), ...dto, authorId: user.id, createdAt: nowIso };
    db.reviews.unshift(row);
    recomputeRatings(db);
    if (dto.targetType === "venue") notify(getVenue(db, dto.targetId).ownerId, "review", { venue: getVenue(db, dto.targetId).name }, "/owner");
    return reviewOut(db, row);
  });

  /* --------------------------- notifications -------------------------- */
  server.route("GET", "/notifications", "auth", ({ db, requireUser }) => {
    const user = requireUser();
    return db.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  });

  server.route("POST", "/notifications/:id/read", "auth", ({ db, params, requireUser }) => {
    const user = requireUser();
    const n = db.notifications.find((x) => x.id === params.id && x.userId === user.id);
    if (!n) throw notFound("Notification");
    n.read = true;
    return n;
  });

  server.route("POST", "/notifications/read-all", "auth", ({ db, requireUser }) => {
    const user = requireUser();
    for (const n of db.notifications) if (n.userId === user.id) n.read = true;
    return undefined;
  });
}
