import { addDays, dateInPP, schemas, type Field } from "@pitchkh/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NOW, startTestApi } from "./harness";

let api: Awaited<ReturnType<typeof startTestApi>>;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.stop();
});

async function player(name: string, email: string, team?: string) {
  const c = api.client();
  await c.auth.register({ name, email, phone: "+855 12 222 333", password: "secret123", role: "player" });
  if (team) await c.auth.saveTeam({ name: team, sport: "football", level: "intermediate", memberCount: 7, bio: "" });
  return c;
}

describe("match board", () => {
  it("lists the seeded open matches in the contract shape", async () => {
    const board = await api.client().matches.list({ pageSize: 50 });
    expect(board.data.length).toBeGreaterThan(0);
    for (const m of board.data) expect(schemas.MatchRequestDetail.parse(m).status).toBe("open");
  });

  it("posts, joins, accepts one team (declining the rest) and opens a chat", async () => {
    const venue = await api.client().venues.get("toul-kork-arena");
    const noTeam = await player("No Team", "noteam@example.com");
    const date = addDays(dateInPP(NOW), 5);
    const dto = { sport: "football" as const, venueId: venue.id, fieldId: null, bookingId: null, date, startTime: "19:00", endTime: "20:00", level: "intermediate" as const, teamSize: 7, costSplit: "split" as const, note: "Friendly" };
    await expect(noTeam.matches.create(dto)).rejects.toMatchObject({ code: "conflict" });

    const host = await player("Host Player", "host@example.com", "Host FC");
    const a = await player("Away A", "away-a@example.com", "Away A FC");
    const b = await player("Away B", "away-b@example.com", "Away B FC");
    const posted = await host.matches.create(dto);
    expect(posted.isHost).toBe(true);

    await a.matches.join(posted.id, "We're in");
    await b.matches.join(posted.id, "Us too");
    await expect(a.matches.join(posted.id, "again")).rejects.toMatchObject({ code: "conflict" });
    const hostView = await host.matches.get(posted.id);
    expect(hostView.pendingCount).toBe(2);
    const requestA = hostView.joinRequests.find((j) => j.team.name === "Away A FC");

    const matched = await host.matches.decide(posted.id, requestA?.id as string, "accept");
    expect(matched.status).toBe("matched");
    expect(matched.opponentTeam?.name).toBe("Away A FC");
    expect((await b.matches.get(posted.id)).myJoinRequest?.status).toBe("declined");

    // The two captains can chat.
    const threadId = (await a.matches.get(posted.id)).conversationId as string;
    expect(threadId).toBeTruthy();
    // The test clock is frozen: send the message a minute after the thread opened.
    api.setNow(new Date(NOW.getTime() + 60_000));
    await a.chat.send(threadId, "See you at 7!");
    const hostThreads = await host.chat.list();
    expect(hostThreads.find((c) => c.id === threadId)?.unreadCount).toBe(1);
    await host.chat.markRead(threadId);
    expect((await host.chat.list()).find((c) => c.id === threadId)?.unreadCount).toBe(0);
    expect((await host.chat.get(threadId)).messages.map((m) => m.body)).toEqual(["See you at 7!"]);
    await expect(b.chat.get(threadId)).rejects.toMatchObject({ status: 403 });
    api.setNow(NOW);
  });

  it("posts a match from a 'Find me an opponent' booking and takes it down on cancel", async () => {
    const p = await player("Finder", "finder@example.com");
    const venue = await p.venues.get("koh-pich-football-park");
    const field = venue.fields[2] as Field;
    const booking = await p.bookings.create({ fieldId: field.id, date: addDays(dateInPP(NOW), 8), startTime: "17:00", endTime: "18:00", teamSize: 7, referee: false, extras: { waterBottles: 0, ball: false, bibs: false }, notes: "", opponentMode: "find", matchLevel: "beginner", paymentMethod: "cash" });
    expect(booking.matchRequestId).toBeTruthy();
    const match = await p.matches.get(booking.matchRequestId as string);
    expect(match.status).toBe("open");
    expect(match.hostTeam.name).toBe("Finder's team");
    await p.bookings.cancel(booking.id);
    expect((await p.matches.get(booking.matchRequestId as string)).status).toBe("cancelled");
  });
});

describe("chat with a venue and reviews", () => {
  it("reuses one thread per player and venue", async () => {
    const p = await player("Asker", "asker@example.com");
    const venue = await p.venues.get("bkk-sports-club");
    const first = await p.chat.startWithVenue(venue.id);
    const again = await p.chat.startWithVenue(venue.id);
    expect(again.id).toBe(first.id);
    expect(first.participants.map((x) => x.id)).toContain(venue.owner.id);
  });

  it("rates a played booking once and updates the venue rating", async () => {
    const dara = api.client();
    await dara.auth.login({ email: "dara@pitchkh.app", password: "password" });
    const done = (await dara.bookings.list({ scope: "past", pageSize: 50 })).data.find((b) => b.status === "completed" && !b.reviewed);
    expect(done).toBeDefined();
    const before = await dara.venues.get(done?.venue.slug as string);
    const review = await dara.reviews.create({ targetType: "venue", targetId: done?.venueId as string, bookingId: done?.id as string, rating: 1, comment: "Lights were off" });
    expect(schemas.Review.parse(review).authorName).toBe("Sok Dara");
    await expect(dara.reviews.create({ targetType: "venue", targetId: done?.venueId as string, bookingId: done?.id as string, rating: 5, comment: "" })).rejects.toMatchObject({ code: "conflict" });
    const after = await dara.venues.get(before.slug);
    expect(after.reviewCount).toBe(before.reviewCount + 1);
    expect(after.rating).toBeLessThan(before.rating);
    expect((await dara.bookings.get(done?.id as string)).reviewed).toBe(true);
    const list = await api.client().reviews.list({ targetType: "venue", targetId: before.id });
    expect(list.data[0]?.comment).toBe("Lights were off");
  });
});
