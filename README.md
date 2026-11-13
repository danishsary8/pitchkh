# PitchKH

Book football, volleyball and tennis fields across Cambodia, and find an
opponent for your team. This repository contains the **complete web frontend**
running on mock data, structured so a real backend and a mobile app can plug in
later without rewrites.

| Path | What | Status |
| --- | --- | --- |
| `apps/web` | Next.js 16 (App Router), TypeScript strict, Tailwind v4, shadcn-style UI on Radix | built |
| `packages/shared` | Platform-agnostic types, zod schemas, domain logic, api services, mock server, i18n | built |
| `apps/api` | Backend (Laravel or Flask + PostgreSQL) | placeholder |
| `apps/mobile` | React Native / Expo app | placeholder |
| `docs/` | Architecture, data model, API contract, mobile plan | written |

## Run it

Requirements: Node 20+ and pnpm 10.

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:3000. On the sign-in page, tap a demo account:

| Role | Email | Password | Sees |
| --- | --- | --- | --- |
| Player | dara@pitchkh.app | password | bookings, matches, chat, favorites |
| Venue owner | sophea@pitchkh.app | password | dashboard, requests, schedule, pricing |
| Admin | admin@pitchkh.app | password | approvals, users, reports, analytics |

Demo data lives in your browser's `localStorage`. Reset it from
**Profile -> Demo data -> Reset**.

## Checks

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm test
```

```bash
pnpm build
```

`pnpm check` runs all four. With a production server running (`pnpm build && pnpm start`):

```bash
node apps/web/scripts/screenshots.mjs
```

```bash
node apps/web/scripts/e2e-booking.mjs
```

The first screenshots key pages at 360, 390, 768, 1024 and 1440 px and fails on
horizontal overflow or console errors (add `--login player|owner|admin`,
`--pages /en/owner,...`). The second books a field end to end on a phone viewport.

## Switch to the real backend

1. Build the API from `docs/API_CONTRACT.md` and `docs/DATA_MODEL.md`.
2. Create `apps/web/.env.local`:

   ```bash
   NEXT_PUBLIC_API_MODE=real
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

3. Restart `pnpm dev`. No component, hook or service changes: the same
   `api.venues.list()`, `api.bookings.create()`... now go over HTTP with a
   Bearer token and automatic token refresh.

How that works is explained in `docs/ARCHITECTURE.md`.

## What is in the app

- **Public**: home, venues browse (filters, sort, list/map), venue detail
  (gallery, 3D field viewer, fields, pricing, amenities, hours, map, weather
  hint, reviews, report), help/FAQ, terms, privacy.
- **Booking**: field -> day and time on a live slot grid -> team size, referee,
  extras, opponent mode -> price breakdown -> mock KHQR / ABA / Wing / cash ->
  receipt with add-to-calendar. Cancel and reschedule up to 2 hours before.
- **Matches** (football, volleyball): match board, post a match, ask to join,
  accept/decline, team profiles with sportsmanship ratings, chat.
- **Player area**: bookings, favorites, matches, reviews, notifications, messages, team, profile.
- **Owner dashboard**: earnings, booking requests, day schedule with blocked
  time, venue and field management with per-field pricing.
- **Admin panel**: analytics, venue approval, featured venues, users, reports.
- English and Khmer, light and dark themes, installable PWA with an offline page.

## Images and 3D

All images are rendered from the procedural three.js scenes in
`apps/web/src/features/field3d/scene.ts` (no stock photos, no external
downloads). To re-render after changing a scene or the seed venues:

```bash
node apps/web/scripts/render-assets.mjs
```

This needs Playwright with Chromium. Replace the files in
`apps/web/public/assets/venues` with real venue photos when you have them; the
mock data references them by path.

## Notes

- Payments are simulated. Nothing is charged.
- Map tiles come from OpenStreetMap; the weather hint is a seasonal estimate, not a forecast.
- Prices are stored in USD; KHR is shown at 4,100 riel per dollar.
