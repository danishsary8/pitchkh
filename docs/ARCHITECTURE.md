# Architecture

PitchKH is a pnpm monorepo. The web app is built and working on mock data; the
backend and the mobile app plug in later without rewriting the frontend.

```
pitchkh/
  apps/
    web/        Next.js 16 (App Router) + TypeScript + Tailwind v4   <- built
    api/        Hono + PostgreSQL + Drizzle (Node, TypeScript)       <- built (v1)
    mobile/     placeholder README (React Native / Expo)             <- later
  packages/
    shared/     platform-agnostic TypeScript: no DOM, no React, no Next.js
  docs/         this file, DATA_MODEL, API_CONTRACT, MOBILE_PLAN
  scripts/      i18n-merge.mjs (merge + EN/KM key parity check)
```

## The one rule that makes the backend swap easy

```
UI component -> TanStack Query hook -> api service -> Transport -> (mock server | HTTP)
```

- **UI never imports mock data.** It only calls `api.<feature>.<method>()`.
  An ESLint rule in `apps/web` blocks imports from the mock folder.
- **Api services only know a `Transport`**: a function that takes
  `{ method, path, query, body }` and returns parsed JSON or throws `ApiError`.
- There are two transports with the same behaviour:
  - `mock`: an in-memory server (`packages/shared/src/mock/server.ts`) that
    matches `method + path` to handlers, exactly like a REST backend.
  - `real`: `fetch` to `API_URL` with `Authorization: Bearer <token>`.
- So the mock handlers **are** the API contract in executable form. A backend
  that implements `docs/future-backend/API_CONTRACT.md` is a drop-in replacement.

### Switching to the real backend

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_MODE=real
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
```

Nothing else changes. `apps/web/src/lib/api.ts` is the only file that reads
these env vars; it passes plain config into `createApiClient()`.

## packages/shared

| Folder | What lives there |
| --- | --- |
| `schemas/` | zod schemas, one file per entity. These are the exact JSON shapes of the API. |
| `types/` | TypeScript types inferred from the schemas (`z.infer`), so types and validation never drift. |
| `domain/` | Pure business logic: Phnom Penh time helpers, slot generation, conflict detection, price calculation, KHR conversion, cancellation rules, weather hint, `.ics` export. Unit-tested with vitest. |
| `api/` | `ApiError`, `Transport`, HTTP client, token refresh, `SessionStore`, one service per feature, `createApiClient()`. |
| `mock/` | `StorageAdapter`, mock DB shape, deterministic seed (Cambodian venues), mock server and route handlers. |
| `i18n/` | `en.json` and `km.json`, shared by web and mobile. |
| `config.ts` | `SharedConfig` (injected: api mode, URL, storage, fetch, clock) and `APP` business constants. |

Why shared code has no platform imports:

- `tsconfig` uses `lib: ["ES2022"]` only, so using `window`, `document` or
  `fetch` directly is a **compile error**.
- Storage is injected through `StorageAdapter` (`getItem/setItem/removeItem`
  returning Promises). Web wraps `localStorage`; mobile passes `AsyncStorage`.
- `fetch` is injected through `SharedConfig.fetch`.
- ESLint also forbids `react`, `next` and browser globals in this package.

### Every api function

- is `async` and fully typed (request DTO in, entity out)
- waits 300-800 ms in mock mode to simulate a network
- throws a typed `ApiError { status, code, message, details }`
- uses UUID ids and ISO-8601 timestamps with the `+07:00` offset
- list endpoints accept `page`, `pageSize`, filters and `sort`, and return
  `{ data: T[], meta: { page, pageSize, total, totalPages } }`

### Auth

`AuthProvider` (web) only calls `api.auth`. Login returns
`{ accessToken, refreshToken, expiresAt, user }`. Tokens are stored through the
`StorageAdapter` and attached by the transport. `withTokenRefresh()` wraps both
transports: on a `401 token_expired` it calls `POST /auth/refresh` once
(de-duplicated across parallel requests) and replays the request. The mock
server issues tokens that really expire after 60 minutes, so this path runs in
mock mode too. A JWT backend needs no frontend change.

Route guards: `<RequireAuth roles={[...]}>` wraps the `account`, `owner`,
`admin` and booking-detail routes. The server must still enforce roles; the
"Roles" column in the API contract says which.

## apps/api (removed for now)

> The backend is not part of the current demo, which runs entirely in the browser.
> This section describes the v1 backend kept in git history; see "Future plan:
> backend" in the README for how to bring it back.

```
src/
  main.ts          starts the server (reads .env)
  app.ts           Hono app: request IDs + JSON logs, security headers, CORS, body limit,
                   rate limits, error shape, /health (checks the database), mounts /api/v1
  rate-limit.ts    in-memory rate limits (sign-in, sign-up, password reset, per-IP cap)
  observability.ts request IDs, client IP, structured logs
  http.ts          route(method, path, access, handler) + auth + notifications
  views.ts         read models: load rows, run the shared summary logic
  telegram.ts      bot client, alert messages (EN/KM), owner lookup
  payments.ts      payment providers (sandbox, bakong) behind one interface
  storage.ts       venue photos: local disk or Cloudflare R2 behind one interface
  auth/tokens.ts   JWT access tokens, rotating refresh tokens
  routes/          auth, venues, bookings, notifications, owner, admin, telegram
  db/              schema.ts (Drizzle), migrations/*.sql, migrate.ts, seed.ts, mappers.ts
test/              contract tests through the web app's own API client (real mode)
```

- **Same rules as the mock.** Validation uses the shared zod schemas
  (`parse(schemas.X, body)`), prices and slots use `packages/shared/src/domain`,
  and response joins reuse `@pitchkh/shared/mock` (`venueSummary`,
  `bookingDetail`...). A read loads only the rows it needs, then runs that
  shared code; a write is SQL inside a transaction.
- **No double booking, even under load.** `bookings` has an exclusion
  constraint (`btree_gist`): two pending/confirmed bookings of one pitch can
  never overlap. A race loser gets `409 slot_unavailable`.
- **Sessions.** 60-minute JWT access tokens (`token_expired` triggers the
  client's refresh) and 30-day refresh tokens stored as hashes, rotated on use.
- **Telegram.** Owner notifications for bookings are also sent to a linked
  Telegram chat after the response is committed; a Telegram outage never fails
  a booking.
- **Photos.** `PhotoStorage` has two methods (`save`, `remove`). `STORAGE=local`
  writes to `UPLOAD_DIR` and serves `/uploads/...`; `STORAGE=r2` PUTs to a
  Cloudflare R2 bucket (S3 API, requests signed by `aws4fetch`) and returns the
  bucket's public URL, so photos survive redeploys on free hosts. Either way,
  only files the API named itself (24 hex chars) are ever deleted.

## apps/web

```
src/
  app/[locale]/...     thin route files: validate locale, render one feature component
  components/ui        shadcn-style primitives on Radix (button, sheet, tabs...)
  components/common    link (view transitions), page blocks, states, motion, price
  components/layout    app shell (navbar / bottom tabs), providers, footer
  components/brand     wordmark, pitch line art, krama strip, sport icons
  features/<feature>   UI + hooks per feature (venues, booking, pitch-map, matches,
                       chat, account, owner, admin, auth, field3d, home, content)
  lib                  api client, query keys, formatting, hooks, view transitions
  i18n                 next-intl routing (/en, /km), navigation, request config
  stores               zustand (UI transition state, booking draft)
```

- **Server state**: TanStack Query on top of the api services. Query keys live
  in `lib/query.ts`. Mutations use optimistic updates where a rollback is cheap
  (favorites, chat send, accept/decline requests).
- **Client state**: zustand for the booking draft (persisted to
  `sessionStorage` so it survives the sign-in redirect) and the shared-element
  transition.
- **Forms**: react-hook-form + the shared zod schemas (same validation the API
  applies).
- **i18n**: next-intl with a `[locale]` segment. Messages come from
  `packages/shared/i18n`. `node scripts/i18n-merge.mjs` fails if EN and KM keys differ.
- **Motion**: route changes use the View Transitions API (crossfade + venue
  photo morph from card to page) with a Framer Motion fallback; scroll reveal,
  staggered lists, animated slot grid. Only `transform`/`opacity` animate, and
  `prefers-reduced-motion` is honoured.
- **3D**: `features/field3d/scene.ts` builds low-poly scenes in plain three.js.
  The viewer is loaded on demand (button on phones, automatic on desktop) with a
  pre-rendered poster and a low-poly mode for weaker devices.
  `scripts/render-assets.mjs` renders all photos, posters, icons and GLB models
  from the same scene code.
- **Pitch map**: `features/pitch-map` draws a venue's top-down plan as SVG from
  `Field.layout` (metres). Layout maths (`pitchSize`, `autoLayout`,
  `resolveLayout`, `findLayoutOverlap`) lives in `packages/shared/src/domain/layout.ts`
  so the mobile app and the backend can reuse it. The same `PitchShape` is used by
  the booking screen, the venue page and the owner's editor
  (`features/owner/layout-editor.tsx`).
- **PWA**: `app/manifest.ts`, `public/sw.js` (network-first pages with an
  offline fallback, cache-first static assets), `/[locale]/offline`.

## Mobile-first rules used everywhere

- Layouts are written for 360-430 px first, then `md` (768), `lg` (1024), `xl`.
- Below 1024 px: bottom tab bar (players: Home/Venues/Matches/Bookings/Profile; owners and admins
  get Dashboard/Admin instead of Bookings, and inside /owner or /admin the bar holds that
  section's pages), sticky bottom action bars, bottom sheets
  (vaul) for filters and forms. From 1024 px: top navbar, sidebars, sticky cards.
- Touch targets are at least 44 px; inputs are 16 px to stop iOS zoom.
- Safe-area insets and `dvh` units; no hover-only interactions.
- Dashboard tables become labelled cards below 768 px (`ResponsiveTable`).

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build
node apps/web/scripts/render-assets.mjs     # re-render images / 3D posters
node apps/web/scripts/screenshots.mjs       # 5-width screenshots + overflow check
node apps/web/scripts/e2e-booking.mjs       # book -> pay -> receipt -> cancel
```
