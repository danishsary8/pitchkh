# PitchKH

**Book a football, volleyball or tennis pitch at our branches in Phnom Penh, with no account needed.**

[![CI](https://github.com/danishsary8/pitchkh/actions/workflows/ci.yml/badge.svg)](https://github.com/danishsary8/pitchkh/actions/workflows/ci.yml)
&nbsp;Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Postgres (Neon) · Telegram Mini App

Version 1 covers the essentials for one business with 3 branches:

- **Customers** pick a branch, a day, a start time and a pitch on a top-down map of the venue,
  then send their name and phone. No sign-up. It works as a website and as a Telegram Mini App.
- **Staff** get each request as a Telegram message and confirm it in `/admin`, which shows a
  per-branch day timeline. Staff can also add walk-in and phone bookings. Access is by
  Telegram identity, so there are no passwords.
- **Customers hear back on Telegram** when their booking is confirmed or cancelled.

English and Khmer, light and dark, phone first.

**Going live:** follow [docs/LAUNCH.md](docs/LAUNCH.md).

## Where things are

| Path | What |
|---|---|
| `apps/web/src/lib/branches.ts` | Branches, pitches, hours and prices (edit this to change them) |
| `apps/web/src/lib/booking-rules.ts` | Booking rules and the request schema, shared by the screens and the server |
| `apps/web/src/lib/availability.ts` | Free/taken logic for the customer screens (pure, tested) |
| `apps/web/src/lib/client.ts` | Typed calls to the app's own REST API |
| `apps/web/src/app/api/` | REST API: availability, bookings, staff, health |
| `apps/web/src/server/` | Database (Postgres or in-memory), Telegram identity checks and bot messages |
| `apps/web/src/features/book/` | Customer screens: home, branch booking (day, time, pitch pickers, summary), form, ticket |
| `apps/web/src/features/staff/` | Staff screens |
| `apps/web/db/schema.sql` | Database schema (applied automatically) |
| `packages/shared/` | Shared types, pitch-map layout, pricing helpers and translations |

### REST API

| Method and path | Who | What |
|---|---|---|
| `GET /api/branches/:slug/taken?date=` | anyone | Which pitches are taken when (no personal data) |
| `POST /api/bookings` | anyone | Ask for a pitch; saved as waiting. 409 if the slot was just taken |
| `GET /api/admin/bookings?branch=&date=` | staff | A day's bookings plus every waiting request |
| `POST /api/admin/bookings` | staff | Walk-in or phone booking, confirmed at once |
| `PATCH /api/admin/bookings/:id` | staff | Confirm, cancel or restore |
| `GET /api/health` | anyone | Database, bot and staff setup at a glance |

Staff are recognised by the signed Telegram Mini App identity (`x-telegram-init-data`), checked
against `ADMIN_TELEGRAM_IDS`. Errors are JSON `{ "error": "<code>" }`.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:3000. Bookings in memory, /admin open locally
pnpm test       # unit and API-route tests (vitest)
pnpm check      # translations, types, lint, tests, build
```

Photo credits are on the `/credits` page.
