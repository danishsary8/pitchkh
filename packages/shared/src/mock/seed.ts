import { DEMO_PASSWORD } from "../constants";
import { bookingCode, createRng, uuid } from "../domain/ids";
import { resolveLayout } from "../domain/layout";
import { calculatePrice } from "../domain/pricing";
import { findConflict, hoursFor } from "../domain/slots";
import { addDays, dateInPP, isoInPP, minutesOf, timeOf, toIso } from "../domain/time";
import type { Booking, Field, MatchRequest, OpeningHours, PaymentMethod, Team, User, Venue } from "../types";
import { MOCK_DB_VERSION, type MockDb } from "./db";
import { PLAYER_SEEDS, TEAM_REVIEW_COMMENTS, VENUE_REVIEW_COMMENTS, VENUE_SEEDS } from "./seed-data";

/** Builds a fresh, deterministic demo database with dates relative to `now`. */
export function seedDb(now: Date): MockDb {
  const rng = createRng(20261112);
  const id = (): string => uuid(rng);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
  const today = dateInPP(now);
  const nowIso = isoInPP(now);
  const daysAgoIso = (days: number, time = "10:00"): string => toIso(addDays(today, -days), time);

  const db: MockDb = {
    version: MOCK_DB_VERSION, seededAt: nowIso, users: [], passwords: {}, teams: [], venues: [], fields: [], bookings: [], blocks: [],
    matchRequests: [], joinRequests: [], conversations: [], messages: [], reviews: [], favorites: [], notifications: [], reports: [],
  };

  /* ------------------------------ users ------------------------------ */
  const addUser = (name: string, email: string, role: User["role"], province: User["homeProvince"], phoneTail: number): User => {
    const user: User = {
      id: id(), role, name, email, phone: `+855 12 ${String(100000 + phoneTail * 7919).slice(0, 3)} ${String(phoneTail * 37 + 100).slice(0, 3)}`,
      avatarUrl: null, locale: "en", status: "active", teamId: null, homeProvince: province, createdAt: daysAgoIso(90 + phoneTail * 9),
    };
    db.users.push(user);
    db.passwords[user.id] = DEMO_PASSWORD;
    return user;
  };
  const admin = addUser("Keo Vanna", "admin@pitchkh.app", "admin", "phnom_penh", 1);
  const owners = {
    sophea: addUser("Chan Sophea", "sophea@pitchkh.app", "owner", "phnom_penh", 2),
    piseth: addUser("Lim Piseth", "piseth@pitchkh.app", "owner", "phnom_penh", 3),
    sreyneang: addUser("Heng Sreyneang", "sreyneang@pitchkh.app", "owner", "phnom_penh", 4),
  };
  const players = PLAYER_SEEDS.map((p, i) => {
    const email = `${p.name.split(" ")[1]?.toLowerCase() ?? `player${i}`}@pitchkh.app`;
    const user = addUser(p.name, email, "player", p.province, 5 + i);
    if (p.team) {
      const played = 6 + Math.floor(rng() * 30);
      const team: Team = {
        id: id(), name: p.team.name, sport: p.team.sport, captainId: user.id, level: p.team.level, memberCount: p.team.sport === "football" ? 9 + Math.floor(rng() * 6) : 7 + Math.floor(rng() * 4),
        color: p.team.color, bio: p.team.bio, homeProvince: p.province, matchesPlayed: played, wins: Math.floor(played * (0.3 + rng() * 0.4)), sportsmanship: 0, sportsmanshipCount: 0, createdAt: user.createdAt,
      };
      db.teams.push(team);
      user.teamId = team.id;
    }
    return user;
  });
  const dara = players[0] as User;
  const teamOf = (user: User): Team => db.teams.find((t) => t.id === user.teamId) as Team;
  const playerByTeam = (name: string): User => db.users.find((u) => u.teamId === db.teams.find((t) => t.name === name)?.id) as User;

  /* --------------------------- venues, fields ------------------------- */
  VENUE_SEEDS.forEach((seed, index) => {
    const openingHours: OpeningHours[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, open: seed.hours[0], close: seed.hours[1], closed: false }));
    const venue: Venue = {
      id: id(), ownerId: owners[seed.owner].id, slug: seed.slug, name: seed.name, nameKm: seed.nameKm, description: seed.description, descriptionKm: seed.descriptionKm,
      province: seed.province, district: seed.district, address: seed.address, lat: seed.lat, lng: seed.lng,
      sports: [...new Set(seed.fields.map((x) => x.sport))], photos: [1, 2, 3].map((n) => `/assets/venues/${seed.slug}-${n}.webp`),
      amenities: seed.amenities, openingHours, phone: `+855 23 ${210 + index} ${300 + index * 11}`, rating: 0, reviewCount: 0,
      verified: seed.verified, featured: seed.featured, status: seed.status, moderationNote: seed.moderationNote ?? null, createdAt: daysAgoIso(seed.status === "pending" ? 1 + index % 3 : 200 - index * 9),
    };
    db.venues.push(venue);
    for (const fs of seed.fields) {
      db.fields.push({
        id: id(), venueId: venue.id, sport: fs.sport, name: fs.name, position: fs.position, surface: fs.surface, indoor: fs.indoor, format: fs.format,
        maxPlayers: fs.maxPlayers, pricePerHourUsd: fs.price, peakPricePerHourUsd: fs.peak, lit: true, status: "active", layout: fs.layout ?? null,
      });
    }
    // Venues without a hand-drawn plan start from the auto arrangement, like a new owner would.
    const own = db.fields.filter((x) => x.venueId === venue.id);
    for (const [fieldId, layout] of resolveLayout(own)) (own.find((x) => x.id === fieldId) as Field).layout = layout;
  });
  const venueBySlug = (slug: string): Venue => db.venues.find((v) => v.slug === slug) as Venue;
  const fieldOf = (slug: string, name: string): Field => db.fields.find((x) => x.venueId === venueBySlug(slug).id && x.name === name) as Field;

  /* ------------------------------ bookings ---------------------------- */
  const addBooking = (user: User, field: Field, dayOffset: number, start: string, end: string, opts: Partial<Pick<Booking, "status" | "paymentMethod" | "opponentMode" | "referee" | "notes" | "teamSize">> & { water?: number } = {}): Booking | null => {
    const date = addDays(today, dayOffset);
    const startAt = toIso(date, start);
    const endAt = toIso(date, end);
    if (findConflict({ fieldId: field.id, startAt, endAt, bookings: db.bookings, blocks: [] })) return null;
    const paymentMethod: PaymentMethod = opts.paymentMethod ?? pick(["khqr", "khqr", "aba", "aba", "wing"] as const);
    const ended = Date.parse(endAt) <= now.getTime();
    const status: Booking["status"] = opts.status ?? (ended ? "completed" : paymentMethod === "cash" ? "pending" : "confirmed");
    const extras = { waterBottles: opts.water ?? (rng() < 0.4 ? 6 + Math.floor(rng() * 3) * 6 : 0), ball: rng() < 0.3, bibs: field.sport === "football" && rng() < 0.35 };
    const referee = opts.referee ?? (field.sport !== "tennis" && rng() < 0.2);
    const booking: Booking = {
      id: id(), code: bookingCode(rng), userId: user.id, venueId: field.venueId, fieldId: field.id, sport: field.sport, date, startAt, endAt,
      teamSize: opts.teamSize ?? Math.min(field.maxPlayers, field.sport === "tennis" ? 2 : Number(field.format[0]) || 6), referee, extras, notes: opts.notes ?? "",
      opponentMode: opts.opponentMode ?? "have", matchRequestId: null,
      price: calculatePrice({ field, date, startTime: start, endTime: end, referee, extras }),
      paymentMethod, paymentStatus: status === "cancelled" ? (paymentMethod === "cash" ? "unpaid" : "refunded") : paymentMethod === "cash" && !ended ? "unpaid" : "paid",
      status, createdAt: toIso(addDays(date, -2 - Math.floor(rng() * 3)), "12:15"), cancelledAt: status === "cancelled" ? toIso(addDays(date, -1), "09:30") : null,
    };
    db.bookings.push(booking);
    return booking;
  };

  // The demo player's own bookings go in first so their slots are guaranteed free.
  const daraUpcoming = addBooking(dara, fieldOf("bkk-sports-club", "Field B"), 1, "18:00", "19:30", { paymentMethod: "khqr", opponentMode: "find", referee: true, water: 12, notes: "We will bring our own ball.", teamSize: 7 }) as Booking;
  addBooking(dara, fieldOf("toul-kork-arena", "Hall A"), 3, "19:00", "20:00", { paymentMethod: "cash", teamSize: 6, water: 6 });
  addBooking(dara, fieldOf("sen-sok-sports-hub", "Court 1"), 6, "07:00", "08:00", { paymentMethod: "aba", teamSize: 2, water: 0 });
  const daraPastA = addBooking(dara, fieldOf("koh-pich-football-park", "Pitch 2"), -2, "18:00", "19:30", { paymentMethod: "aba", teamSize: 7 }) as Booking;
  const daraPastB = addBooking(dara, fieldOf("toul-kork-arena", "Field 1"), -5, "19:00", "20:30", { paymentMethod: "khqr", teamSize: 7 }) as Booking;
  addBooking(dara, fieldOf("bkk-sports-club", "Field A"), -6, "20:00", "21:00", { paymentMethod: "wing", teamSize: 5 });
  addBooking(dara, fieldOf("angkor-sports-village", "Palm Pitch"), -4, "17:00", "18:00", { paymentMethod: "khqr", status: "cancelled", teamSize: 7 });

  // Background traffic so slot grids, owner schedules and analytics look real.
  const startHours = [6, 7, 8, 9, 16, 17, 17, 18, 18, 18, 19, 19, 19, 20, 20, 21];
  const others = players.slice(1);
  for (const venue of db.venues.filter((v) => v.status === "approved")) {
    for (const field of db.fields.filter((x) => x.venueId === venue.id)) {
      for (let day = -7; day <= 7; day++) {
        const count = Math.floor(rng() * 2.3);
        for (let n = 0; n < count; n++) {
          const start = pick(startHours) * 60 + (rng() < 0.25 ? 30 : 0);
          const length = pick([60, 60, 90, 90, 120]);
          const hours = hoursFor(venue.openingHours, addDays(today, day));
          if (start < minutesOf(hours.open) || start + length > minutesOf(hours.close)) continue;
          addBooking(pick(others), field, day, timeOf(start), timeOf(start + length), rng() < 0.14 ? { paymentMethod: "cash" } : {});
        }
      }
    }
  }
  // An owner-blocked window (maintenance) to show the "blocked" slot state.
  db.blocks.push({ id: id(), fieldId: fieldOf("bkk-sports-club", "Field A").id, date: addDays(today, 2), startTime: "06:00", endTime: "09:00", reason: "Floor resurfacing" });

  /* --------------------------- match requests ------------------------- */
  const addMatch = (host: User, slug: string, fieldName: string | null, dayOffset: number, start: string, end: string, extra: Partial<MatchRequest> = {}): MatchRequest => {
    const venue = venueBySlug(slug);
    const field = fieldName ? fieldOf(slug, fieldName) : null;
    const team = teamOf(host);
    const date = addDays(today, dayOffset);
    const m: MatchRequest = {
      id: id(), hostUserId: host.id, hostTeamId: team.id, sport: team.sport, venueId: venue.id, fieldId: field?.id ?? null, bookingId: null, date,
      startAt: toIso(date, start), endAt: toIso(date, end), level: team.level, teamSize: field ? Number(field.format[0]) || 6 : team.sport === "football" ? 7 : 6,
      costSplit: "split", note: "", status: "open", createdAt: toIso(addDays(date, -3), "08:40"), ...extra,
    };
    db.matchRequests.push(m);
    return m;
  };

  const daraMatch = addMatch(dara, "bkk-sports-club", "Field B", 1, "18:00", "19:30", { bookingId: daraUpcoming.id, note: "Field is booked and paid, referee included. Looking for a fair 7-a-side game.", createdAt: daysAgoIso(1, "20:10") });
  daraUpcoming.matchRequestId = daraMatch.id;
  const m2 = addMatch(playerByTeam("Toul Kork United"), "toul-kork-arena", "Field 2", 2, "19:00", "20:30", { note: "Friendly 7v7, we split the pitch fee." });
  const matched = addMatch(playerByTeam("Mekong Tigers"), "koh-pich-football-park", "Pitch 3", 2, "20:00", "21:30", { status: "matched", costSplit: "loser_pays", note: "Loser pays the pitch. Referee booked." });
  addMatch(playerByTeam("Naga Spikers"), "toul-kork-arena", "Hall B", 1, "19:00", "20:30", { note: "Mixed teams welcome. Best of five sets." });
  addMatch(playerByTeam("Sen Sok Strikers"), "sen-sok-sports-hub", "Field A", 3, "17:30", "19:00", { note: "We are beginners, please be gentle.", costSplit: "split" });
  addMatch(playerByTeam("Bassac Blockers"), "sen-sok-sports-hub", "Hall Court", 4, "18:30", "20:00", { note: "Training match before the city league.", costSplit: "host_pays" });
  addMatch(playerByTeam("Chroy Changvar City"), "koh-pich-football-park", null, 5, "18:00", "19:30", { note: "No pitch booked yet. Happy to book once we have an opponent." });
  addMatch(playerByTeam("Angkor Warriors"), "angkor-sports-village", "Palm Pitch", 2, "17:00", "18:30", { note: "Visiting teams welcome!" });
  addMatch(playerByTeam("Otres Sand Kings"), "otres-beach-arena", "Beach Court 1", 1, "17:00", "18:00", { note: "Sunset game, losers buy the coconuts.", costSplit: "loser_pays" });
  addMatch(playerByTeam("Battambang Bulls"), "sangkae-football-centre", "Turf 1", 4, "18:00", "19:30", { note: "Strong teams only please." });
  addMatch(playerByTeam("Sla Kram Smashers"), "siem-reap-volley-garden", "Sand 2", 3, "18:00", "19:00", { note: "Learning the game, any level is fine." });
  addMatch(playerByTeam("Kampot Pepper FC"), "kampot-riverside-pitch", "Riverside Pitch", 6, "17:00", "18:30", { note: "Sunday kickabout by the river." });

  const addJoin = (match: MatchRequest, user: User, message: string, status: "pending" | "accepted" | "declined", hoursAgo: number): void => {
    db.joinRequests.push({ id: id(), matchRequestId: match.id, userId: user.id, teamId: teamOf(user).id, message, status, createdAt: isoInPP(new Date(now.getTime() - hoursAgo * 3_600_000)) });
  };
  addJoin(daraMatch, playerByTeam("Toul Kork United"), "We can bring 8 players. Split the fee 50/50?", "pending", 5);
  addJoin(daraMatch, playerByTeam("Chroy Changvar City"), "Free that evening and happy with a referee.", "pending", 2);
  addJoin(m2, dara, "Riverside FC would love this one. We have bibs.", "pending", 9);
  addJoin(matched, dara, "We are in. See you at Koh Pich.", "accepted", 30);
  addJoin(matched, playerByTeam("Sen Sok Strikers"), "Can we join?", "declined", 33);

  /* ---------------------------- conversations ------------------------- */
  const addThread = (kind: "match" | "venue" | "support", title: string, people: User[], matchRequestId: string | null, lines: [User, string, number][]): void => {
    const convId = id();
    const readAt: Record<string, string> = {};
    for (const p of people) readAt[p.id] = isoInPP(new Date(now.getTime() - 4 * 3_600_000));
    db.conversations.push({ id: convId, kind, title, matchRequestId, participantIds: people.map((p) => p.id), readAt, createdAt: daysAgoIso(2) });
    for (const [sender, body, hoursAgo] of lines) {
      db.messages.push({ id: id(), conversationId: convId, senderId: sender.id, body, createdAt: isoInPP(new Date(now.getTime() - hoursAgo * 3_600_000)) });
    }
  };
  const sovann = playerByTeam("Mekong Tigers");
  addThread("match", "Mekong Tigers vs Riverside FC", [sovann, dara], matched.id, [
    [sovann, "Welcome aboard! Pitch 3 is booked from 8pm.", 29],
    [dara, "Great, thanks. What colour are you wearing?", 28],
    [sovann, "Orange. Can you bring dark bibs?", 27],
    [dara, "Will do. We have green ones.", 26],
    [sovann, "Perfect. Referee is confirmed too. See you Friday!", 3],
  ]);
  addThread("venue", "BKK Sports Club", [dara, owners.sophea], null, [
    [dara, "Hello, is there car parking for the 6pm booking tomorrow?", 20],
    [owners.sophea, "Hi Dara! Yes, 10 car spaces at the back and motorbike parking in front.", 19],
    [owners.sophea, "Please arrive 10 minutes early so the staff can hand over the bibs.", 2],
  ]);
  addThread("support", "PitchKH Support", [dara, admin], null, [[admin, "Welcome to PitchKH! Message us here any time you need help with a booking.", 70]]);

  /* ------------------------------ reviews ----------------------------- */
  for (const venue of db.venues.filter((v) => v.status === "approved")) {
    const count = 3 + Math.floor(rng() * 5);
    const authors = [...others].sort(() => rng() - 0.5).slice(0, count);
    authors.forEach((author, i) => {
      db.reviews.push({ id: id(), targetType: "venue", targetId: venue.id, authorId: author.id, bookingId: null, rating: pick([5, 5, 5, 4, 4, 4, 3]), comment: pick(VENUE_REVIEW_COMMENTS), createdAt: daysAgoIso(3 + i * 6 + Math.floor(rng() * 5), "20:30") });
    });
  }
  db.reviews.push({ id: id(), targetType: "venue", targetId: daraPastB.venueId, authorId: dara.id, bookingId: daraPastB.id, rating: 5, comment: "Field 1 is our favourite. Lights are bright and the staff are quick with the bibs.", createdAt: daysAgoIso(4, "21:10") });
  for (const team of db.teams) {
    const count = 1 + Math.floor(rng() * 4);
    const authors = others.filter((u) => u.teamId !== team.id).sort(() => rng() - 0.5).slice(0, count);
    for (const author of authors) {
      db.reviews.push({ id: id(), targetType: "team", targetId: team.id, authorId: author.id, bookingId: null, rating: pick([5, 5, 4, 4, 4, 3]), comment: pick(TEAM_REVIEW_COMMENTS), createdAt: daysAgoIso(5 + Math.floor(rng() * 40), "21:00") });
    }
  }
  recomputeRatings(db);

  /* ------------------ favorites, notifications, reports ---------------- */
  for (const slug of ["bkk-sports-club", "koh-pich-football-park", "otres-beach-arena"]) {
    db.favorites.push({ userId: dara.id, venueId: venueBySlug(slug).id, createdAt: daysAgoIso(12) });
  }
  const note = (user: User, type: MockDb["notifications"][number]["type"], params: Record<string, string>, href: string, hoursAgo: number, read = false): void => {
    db.notifications.push({ id: id(), userId: user.id, type, params, href, read, createdAt: isoInPP(new Date(now.getTime() - hoursAgo * 3_600_000)) });
  };
  note(dara, "join_request", { team: "Chroy Changvar City" }, `/matches/${daraMatch.id}`, 2);
  note(dara, "message", { from: "Meas Sovann" }, "/account/messages", 3);
  note(dara, "join_request", { team: "Toul Kork United" }, `/matches/${daraMatch.id}`, 5);
  note(dara, "booking_confirmed", { venue: "BKK Sports Club", code: daraUpcoming.code }, `/booking/${daraUpcoming.id}`, 26, true);
  note(dara, "join_accepted", { team: "Mekong Tigers" }, `/matches/${matched.id}`, 29, true);
  note(dara, "review", { venue: "Koh Pich Football Park" }, `/booking/${daraPastA.id}`, 40, true);
  note(owners.sophea, "booking_pending", { venue: "Toul Kork Arena", customer: "Sok Dara" }, "/owner/bookings", 6);
  note(owners.sophea, "message", { from: "Sok Dara" }, "/account/messages", 20, true);
  note(admin, "system", { text: "2 venue listings are waiting for review." }, "/admin/venues", 8);

  const report = (reporter: User, targetType: MockDb["reports"][number]["targetType"], targetId: string, reason: MockDb["reports"][number]["reason"], details: string, days: number, status: "open" | "resolved" = "open", resolution: string | null = null): void => {
    db.reports.push({ id: id(), reporterId: reporter.id, targetType, targetId, reason, details, status, resolution, createdAt: daysAgoIso(days, "14:20") });
  };
  report(players[4] as User, "venue", venueBySlug("russey-keo-futsal").id, "wrong_info", "Listing says open until 11pm but the gate was locked at 10pm.", 1);
  report(players[2] as User, "user", (players[9] as User).id, "no_show", "Their team accepted our match and never arrived. We paid the full pitch fee.", 2);
  report(players[6] as User, "review", (db.reviews[4] as MockDb["reviews"][number]).id, "abusive", "This review insults the staff by name.", 3);
  report(players[3] as User, "venue", venueBySlug("meanchey-community-pitch").id, "unsafe", "Broken glass near the corner flag.", 9, "resolved", "Owner confirmed the pitch was cleaned and re-inspected.");

  return db;
}

/** Keeps venue.rating / team.sportsmanship in sync with the reviews table. */
export function recomputeRatings(db: MockDb): void {
  const average = (targetType: "venue" | "team", targetId: string): [number, number] => {
    const rows = db.reviews.filter((r) => r.targetType === targetType && r.targetId === targetId);
    if (rows.length === 0) return [0, 0];
    return [Math.round((rows.reduce((sum, r) => sum + r.rating, 0) / rows.length) * 10) / 10, rows.length];
  };
  for (const venue of db.venues) [venue.rating, venue.reviewCount] = average("venue", venue.id);
  for (const team of db.teams) [team.sportsmanship, team.sportsmanshipCount] = average("team", team.id);
}
