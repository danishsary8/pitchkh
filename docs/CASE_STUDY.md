# PitchKH: case study

**Book a football, volleyball or tennis pitch in Cambodia in two screens, and find a team to play against.**

| | |
| --- | --- |
| **Role** | Full-stack: product, UI, API, database, payments, deployment |
| **Status** | Feature-complete; public demo on the mock API, real launch next ([checklist](future-backend/SETUP_CHECKLIST.md)) |
| **Users** | Players, venue owners, admins |
| **Languages** | English · ខ្មែរ |
| **Payments** | Bakong KHQR · cash at the venue |
| **Stack** | Next.js 16, React 19, TypeScript, Tailwind v4, TanStack Query · Hono, PostgreSQL 16, Drizzle · zod · Playwright, Vitest · Docker, Render, Vercel, Cloudflare R2 |

## The problem

Booking a pitch usually means calling or messaging the venue, waiting for an answer, sending
a deposit by bank transfer, and sometimes arriving to find the pitch taken. Players can't see
which pitch is free at 19:00, and venue owners juggle requests by hand.

## The solution

- **Players** see each venue as a **top-down pitch map**, tap a pitch and a time, and pay with
  **KHQR** in two screens. The slot is held for 10 minutes while they pay.
- **Owners** draw their venue's map, set prices per pitch, see the day's schedule, block time,
  and get every booking in **Telegram** with Accept / Decline buttons.
- **Admins** approve new venues, feature the best ones and handle reports.
- Players without a full team **post a match** and others ask to join, with chat and reviews.

## How it was built

1. **Contract first.** `packages/shared` holds the types, zod schemas (the exact API shapes),
   the domain rules (slots, pricing, conflicts, pitch layout) and a typed API client.
2. **A mock server that obeys the contract.** The whole web app was built against an in-browser
   mock API, so every screen worked before any backend existed (and it still powers the demo).
3. **Web app in phases:** foundations (brand, i18n, themes, PWA) → home and venues → booking →
   matches and chat → player area → owner dashboard → admin panel → accessibility and speed.
4. **The pitch map:** a layout model in metres, an SVG map for players, and an owner editor
   (drag, rotate, resize, auto-arrange, overlap check).
5. **The real API as the mock's twin:** Hono + PostgreSQL serving the same 72 endpoints, reusing
   the shared rules, with tests that run through the web app's own API client.
6. **Integrations:** Telegram owner alerts, online payments with a provider interface, then real
   Bakong KHQR; email password reset; photo upload, later moved to Cloudflare R2.
7. **Ship:** Dockerfile (migrates on start), Render blueprint, GitHub Actions CI with PostgreSQL,
   a go-live checklist, and a UI/UX review pass with screenshots on a phone screen.

## Key decisions

- **Let the database guarantee no double booking.** A PostgreSQL exclusion constraint
  (`btree_gist`) on bookings: two active bookings of one pitch can never overlap, even under load.
  A test sends 10 players at one slot at once; exactly one succeeds.
- **One contract, two backends.** The UI never imports mock data: UI → TanStack Query → `api.*` →
  mock server or HTTP. Switching the whole app to the real API is one environment variable.
- **Integrations behind small interfaces.** Payments (`sandbox`, `bakong`) and photo storage
  (`local`, `r2`) each have one interface, so tests use fakes and production swaps providers
  through settings.
- **Never trust a client or a label.** Role checks on every route, signed webhooks, rotating
  refresh tokens stored as hashes, uploads checked by their real file signature.
- **Bilingual from day one.** Every string lives in `en.json` and `km.json`; keys are type-checked,
  and a script fails the check if one language is missing a key.

## Numbers

| | |
| --- | --- |
| API endpoints | 72 |
| UI strings | 874, in English and Khmer |
| Automated tests | 25 shared unit tests · 32 API tests on real PostgreSQL · Playwright booking run |
| Database migrations | 4 (plain SQL) |
| TypeScript | about 17,000 lines across web, API and shared |

## Screens

Player: [venue list](images/venue-list.webp) · [pick a pitch](images/booking-pick.webp) ·
[confirm](images/booking-confirm.webp) · [KHQR](images/booking-khqr.webp) ·
[ticket](images/booking-ticket.webp) · [next game](images/home-next-game.webp) ·
[Khmer, dark](images/venue-km-dark.webp)

Owner and admin: [requests](images/owner-requests.webp) · [schedule](images/owner-schedule.webp) ·
[pitch map editor](images/owner-editor.webp) · [analytics](images/admin-analytics.webp)

## What's next

Real launch (Render, Vercel, Bakong, Telegram, Resend, R2), then a mobile app (Expo) that reuses
`packages/shared` ([plan](MOBILE_PLAN.md)).
