# API contract

> **Status:** `apps/api` implements this whole contract, and so does the mock
> in `packages/shared/src/mock`. Both are tested against the same scenarios.

Every endpoint the frontend calls. The mock server in
`packages/shared/src/mock/handlers/*` implements exactly this, and the api
services in `packages/shared/src/api/services.ts` call exactly this. Request and
response shapes are the zod schemas in `packages/shared/src/schemas` (names in
`code` below).

## Conventions

- Base URL: `API_URL`, e.g. `https://api.pitchkh.com/api/v1`. JSON only.
- Auth: `Authorization: Bearer <accessToken>`. Roles: `public` (no token
  needed; a token is still read if sent, e.g. to fill `isFavorite`), `auth`
  (any signed-in user), `owner`, `admin`.
- Ids are UUIDs. Timestamps are ISO-8601 with offset
  (`2026-11-14T18:00:00+07:00`). `date` is `YYYY-MM-DD` and times are `HH:mm`,
  both in Asia/Phnom_Penh.
- JSON keys are camelCase.
- Lists: query `page` (default 1), `pageSize` (default 12, max 100); response
  `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- `204 No Content` (or an empty body) for actions that return nothing.

### Errors

```json
{ "error": { "code": "slot_unavailable", "message": "That time was just taken.", "details": { "startTime": ["unavailable"] } } }
```

| HTTP | code | When |
| --- | --- | --- |
| 422 | `validation_failed` | Body/query failed validation. `details` maps field -> messages |
| 401 | `invalid_credentials` | Wrong email or password |
| 401 | `unauthorized` | Missing/invalid token |
| 401 | `token_expired` | Access token expired: the client refreshes and retries once |
| 403 | `forbidden` | Signed in, but wrong role or not the owner of the resource |
| 403 | `account_suspended` | Account suspended by an admin |
| 404 | `not_found` | Resource does not exist (or is not visible to this user) |
| 409 | `conflict` | State does not allow the action (already answered, not open...) |
| 409 | `slot_unavailable` | The requested time overlaps a booking or a block |
| 409 | `cancellation_window_passed` | Less than 2 hours before start |
| 409 | `email_taken` | Registration with an existing email |
| 422 | `outside_booking_window` | Date is in the past or more than 30 days ahead |
| 413 | `payload_too_large` | Request body over 6 MB (photos are up to 4 MB) |
| 429 | `rate_limited` | Too many attempts; wait the seconds in the `Retry-After` header (limits below) |
| 5xx | `server_error` | Anything else |

Every response carries an `X-Request-Id` header (a well-formed incoming one is kept). The server logs
each request as one JSON line with that ID, so an error a user reports can be found in the logs.

**Rate limits** (real API only; the mock has none). Counted per client IP (the last
`X-Forwarded-For` entry behind the proxy), and per account email where noted:

| Route | Limit |
| --- | --- |
| every route | 600 requests / minute per IP |
| `POST /auth/login` | 10 / 15 min per email, 30 / 15 min per IP |
| `POST /auth/register` | 10 / hour per IP |
| `POST /auth/forgot-password` | 3 / hour per email, 10 / hour per IP |
| `POST /auth/reset-password` | 10 / 15 min per IP |
| `POST /auth/refresh` | 120 / 15 min per IP |

**Health.** `GET /health` (outside `/api/v1`) answers `200 { "ok": true, "db": "up" }` when the
database replies within 2 s, else `503 { "ok": false, "db": "down" }`.

`network_error` is produced by the client when the request never reaches the server.

## Auth

| Method | Path | Roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | public | `LoginDto` `{ email, password }` | `AuthSession` `{ accessToken, refreshToken, expiresAt, user }` | invalid_credentials, account_suspended |
| POST | `/auth/register` | public | `RegisterDto` `{ name, email, phone, password, role: player\|owner }` | `AuthSession` | email_taken, validation_failed |
| POST | `/auth/refresh` | public | `{ refreshToken }` | `AuthSession` (new tokens) | unauthorized |
| POST | `/auth/logout` | public | optional `{ refreshToken }` (revoked when sent) | 204 | – |
| POST | `/auth/forgot-password` | public | `{ email }` | `{ sent: true }` always (no account discovery). Emails a single-use link valid 30 min. The mock adds `demoResetUrl` | validation_failed |
| POST | `/auth/reset-password` | public | `{ token, password }` | `AuthSession` (signed in; other sessions revoked) | invalid_token |
| GET | `/auth/me` | auth | – | `User` | unauthorized |
| PATCH | `/auth/me` | auth | `UpdateProfileDto` `{ name?, phone?, locale?, homeProvince?, avatarUrl? }` | `User` | validation_failed |
| GET | `/me/team` | auth | – | `Team` or `null` | – |
| PUT | `/me/team` | auth | `UpsertTeamDto` `{ name, sport, level, memberCount, bio }` | `Team` (created or updated; sets `user.teamId`) | validation_failed |
| GET | `/teams/:id` | public | – | `{ team: Team, captainName, reviews: Review[] }` | not_found |

## Venues

| Method | Path | Roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/venues` | public | `VenueListQuery`: `q, sport, province, district, minPrice, maxPrice, date, from, to, featured, favorites, sort, page, pageSize` | `Paginated<VenueSummary>` | validation_failed |
| GET | `/venues/:idOrSlug` | public | – | `VenueDetail` (venue + `fields[]` + `owner`) | not_found |
| GET | `/fields/:id/availability` | public | query `date` | `Availability` `{ fieldId, date, closed, open, close, slots: Slot[] }` | not_found |
| GET | `/venues/:idOrSlug/availability` | public | query `date` | `VenueAvailability` `{ venueId, date, fields: Availability[] }` (one entry per field, for the pitch map) | not_found |
| GET | `/weather` | public | query `province, date` | `WeatherHint` | validation_failed |
| PUT | `/favorites/:venueId` | auth | – | `{ venueId, isFavorite: true }` | not_found |
| DELETE | `/favorites/:venueId` | auth | – | `{ venueId, isFavorite: false }` | – |
| POST | `/reports` | auth | `CreateReportDto` `{ targetType, targetId, reason, details }` | `{ id }` | conflict (already reported) |

Notes

- `/venues` returns only `approved` venues. `sort`: `recommended` (featured,
  verified, rating), `price_asc`, `price_desc`, `rating`, `newest`.
- With `sport`, `priceFromUsd` is the cheapest field **of that sport**;
  `minPrice`/`maxPrice` filter on it.
- With `date` + `from` + `to`, only venues with at least one free field in that
  window are returned and `availableFieldCount` is set (otherwise `null`).
- `favorites=true` returns the signed-in user's saved venues.
- Every `VenueSummary` also has `pitchFormats: [{ sport, format, count }]` (active pitches grouped, biggest group first) and `nextFree: { date, times: ["18:00", ...] } | null`: up to 3 start times today (tomorrow if today is done) at which at least one pitch is free for the shortest game. With `date`/`from`, it uses that day and times from `from`. Venue cards link each time to `/book/:slug?date=&time=`.
- `/venues/:idOrSlug` also returns non-approved venues to their owner and to admins.
- `Slot.status`: `available` \| `booked` \| `blocked` \| `past`. `priceUsd` is the price of that 30-minute slot.
- Every `Field` carries `layout: { x, y, w, h } | null`: its rectangle on the venue's top-down plan, in metres from the top-left corner (`h > w` = drawn vertically). `null` = not placed yet; clients auto-arrange it with `resolveLayout()` from `packages/shared`.
- `/weather` is a mock climate hint; a real backend should proxy a forecast provider and keep the shape.

## Bookings

| Method | Path | Roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/bookings/:id/payment` | auth (booker) | – | `PaymentIntent` `{ id, provider, method, amountUsd, amountKhr, status, qrPayload, deeplink, expiresAt, paidAt, bookingStatus }` (reuses the open one) | conflict (not awaiting payment), not_found |
| GET | `/payments/:id` | auth (booker) | – | `PaymentIntent` (poll it every ~2 s) | not_found |
| POST | `/payments/:id/simulate` | auth (booker) | – | `PaymentIntent`. **Sandbox provider only**: stands in for the bank | conflict (expired) |
| POST | `/payments/webhook` | provider | provider event, signed (sandbox: `X-PitchKH-Signature` = HMAC-SHA256 of the raw body with `PAYMENT_WEBHOOK_SECRET`, body `{ type: "payment.succeeded", reference }`) | `{ ok: true }`; duplicates change nothing | unauthorized (bad signature) |
| POST | `/bookings/quote` | public | `QuoteDto` `{ fieldId, date, startTime, endTime, referee, extras }` | `PriceBreakdown` | not_found |
| POST | `/bookings` | auth | `CreateBookingDto` `{ fieldId, date, startTime, endTime, teamSize, referee, extras: { waterBottles, ball, bibs }, notes, opponentMode: have\|find, matchLevel?, paymentMethod }` | `BookingDetail` | slot_unavailable, outside_booking_window, validation_failed |
| GET | `/bookings` | auth | `BookingListQuery`: `scope: upcoming\|past\|all`, `status`, `page`, `pageSize` | `Paginated<BookingDetail>` (own bookings) | – |
| GET | `/bookings/:id` | auth | – | `BookingDetail` | forbidden, not_found |
| POST | `/bookings/:id/cancel` | auth | – | `BookingDetail` (`cancelled`, paid -> `refunded`) | cancellation_window_passed |
| POST | `/bookings/:id/reschedule` | auth | `RescheduleBookingDto` `{ date, startTime, endTime }` | `BookingDetail` (new time and recalculated price) | slot_unavailable, cancellation_window_passed |

Notes

- The server **recomputes the price**; never trust a client total. The formula is in `DATA_MODEL.md` and `domain/pricing.ts`.
- `paymentMethod` `khqr`/`aba`/`wing` -> `status: awaiting_payment`, `paymentStatus: unpaid`, `paymentDueAt` = now + 10 min. The slot is held until then. When the provider confirms (webhook) it becomes `confirmed` + `paid` and both sides are notified; if nobody pays in time the booking is `cancelled` and the slot is free again. A payment that arrives too late is marked `refunded`.
- `cash` -> `pending` + `unpaid` until the venue owner decides.
- `opponentMode: "find"` (football/volleyball only) also creates an open `MatchRequest` linked through `matchRequestId` (and a team for the user if they have none).
- A booking can be read, cancelled and rescheduled by its customer, the venue's owner, or an admin.
- `BookingDetail` adds `venue`, `field`, `customer`, `canCancel`, `canReschedule`, `reviewed` to avoid extra requests.
- Creating/cancelling/rescheduling notifies the venue owner; decisions notify the customer.

## Matches

| Method | Path | Roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/matches` | public | `MatchListQuery`: `sport, province, level, date, mine, status, sort: soonest\|newest, page, pageSize` | `Paginated<MatchRequestDetail>` | – |
| POST | `/matches` | auth | `CreateMatchDto` `{ sport, venueId, fieldId?, bookingId?, date, startTime, endTime, level, teamSize, costSplit, note }` | `MatchRequestDetail` | conflict (no team), validation_failed |
| GET | `/matches/:id` | public | – | `MatchRequestDetail` | not_found |
| POST | `/matches/:id/join` | auth | `{ message }` | `MatchRequestDetail` | conflict (host, not open, no team, already asked) |
| DELETE | `/matches/:id/join` | auth | – | `MatchRequestDetail` (withdraws own request) | not_found |
| POST | `/matches/:id/requests/:requestId/decision` | auth (host) | `{ decision: accept\|decline }` | `MatchRequestDetail` | forbidden, conflict |
| POST | `/matches/:id/cancel` | auth (host) | – | `MatchRequestDetail` | forbidden |

Notes

- Without `mine`, the list returns `status = open` (or the given `status`). `mine=true` returns matches the user hosts or asked to join.
- Open matches whose start time has passed become `expired`.
- `MatchRequestDetail` includes `venue`, `fieldName`, `hostTeam`, `hostName`, `isHost`, `myJoinRequest`, `pendingCount`, `opponentTeam`, `conversationId`, and `joinRequests[]` (**only for the host**).
- Accepting a request: sets it `accepted`, the match `matched`, declines every other pending request, creates a `match` conversation between the two captains, and notifies everyone.

## Chat

| Method | Path | Roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/conversations` | auth | – | `Conversation[]` newest first, with `lastMessage`, `unreadCount` | – |
| POST | `/conversations` | auth | `{ venueId }` | `ConversationDetail` (creates or reuses the player <-> venue owner thread) | not_found |
| GET | `/conversations/:id` | auth (participant) | – | `ConversationDetail` (`messages[]`, `participants[]`) | forbidden |
| POST | `/conversations/:id/messages` | auth (participant) | `{ body }` (1-1000 chars) | `Message` | forbidden, validation_failed |
| POST | `/conversations/:id/read` | auth (participant) | – | 204 | – |

The web client polls the open thread every 8 s. A backend may add WebSockets later without changing these endpoints.

## Reviews and notifications

| Method | Path | Roles | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/reviews` | public | `ReviewListQuery`: `targetType, targetId, authorId, page, pageSize` | `Paginated<Review>` | – |
| POST | `/reviews` | auth | `CreateReviewDto` `{ targetType: venue\|team, targetId, bookingId?, rating 1-5, comment }` | `Review` | conflict (already reviewed, own team), not_found |
| GET | `/notifications` | auth | – | `Notification[]` (latest 50) | – |
| POST | `/notifications/:id/read` | auth | – | `Notification` | not_found |
| POST | `/notifications/read-all` | auth | – | 204 | – |

`Notification.type` + `params` are rendered on the client with the `notif.*` messages, so notifications are translated without the server knowing the language.

## Owner (roles: owner, admin)

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/owner/venues` | – | `VenueDetail[]` (all statuses, own venues) | – |
| POST | `/owner/venues` | `UpsertVenueDto` `{ name, nameKm, description, descriptionKm, province, district, address, lat, lng, phone, amenities[], openingHours[7] }` | `VenueDetail` with `status: pending` | validation_failed |
| PATCH | `/owner/venues/:id` | `UpsertVenueDto` | `VenueDetail` (a `rejected` venue goes back to `pending`) | not_found |
| POST | `/owner/venues/:id/fields` | `UpsertFieldDto` `{ sport, name, position, surface, indoor, format, maxPlayers, pricePerHourUsd, peakPricePerHourUsd, lit, status }` | `Field` | validation_failed (max 3 sports) |
| PATCH | `/owner/fields/:id` | `UpsertFieldDto` | `Field` | not_found |
| DELETE | `/owner/fields/:id` | – | 204 | conflict (upcoming bookings) |
| PUT | `/owner/venues/:id/layout` | `SaveLayoutDto` `{ items: [{ fieldId, layout: { x, y, w, h } }] }` (1–60 items; fields not listed keep their layout) | `VenueDetail` | validation_failed (two pitches overlap, or outside the 0–400 m plan; `details.layout` = the two field ids), not_found |
| GET | `/owner/bookings` | `OwnerBookingListQuery`: `venueId, date, status, scope, page, pageSize` | `Paginated<BookingDetail>` | – |
| POST | `/owner/bookings/:id/decision` | `{ decision: accept\|reject }` | `BookingDetail` | conflict (not pending) |
| GET | `/owner/schedule` | query `venueId, date` | `{ date, open, close, closed, fields: Field[], bookings: BookingDetail[], blocks: AvailabilityBlock[] }` | not_found |
| POST | `/owner/blocks` | `CreateBlockDto` `{ fieldId, date, startTime, endTime, reason }` | `AvailabilityBlock` | slot_unavailable (a booking is in that window) |
| DELETE | `/owner/blocks/:id` | – | 204 | not_found |
| GET | `/owner/earnings` | – | `OwnerEarnings` | – |

| POST | `/owner/venues/:id/photos` | `{ dataUrl }` (JPEG/PNG/WebP, max 4 MB, the bytes are checked) | `VenueDetail` (photo appended; max 8) | validation_failed |
| PUT | `/owner/venues/:id/photos` | `{ photos: string[] }` (new order; the first is the cover; leaving one out deletes it) | `VenueDetail` | validation_failed (unknown photo) |
| GET | `/owner/telegram` | – | `TelegramStatus` `{ enabled, linked, linkUrl }` (`linkUrl` = `t.me/<bot>?start=<one-time code>`) | – |
| DELETE | `/owner/telegram` | – | `TelegramStatus` (unlinked, with a fresh link) | – |

Deleting a pitch that has any booking history returns `409 conflict` (receipts
point at it): set it to `maintenance` instead.

**Telegram webhook** (not called by the web app): `POST /telegram/webhook`,
checked with the `X-Telegram-Bot-Api-Secret-Token` header. `/start <code>`
links the owner's chat; `accept:<bookingId>` / `reject:<bookingId>` button
presses answer a pending request exactly like `/owner/bookings/:id/decision`.

Changing a field's `sport` or `format` through `PATCH /owner/fields/:id` resets its `layout` to `null`, because the old rectangle no longer fits the new size.

Owners only ever see and change their own venues, fields, bookings and blocks (404 otherwise). `venue.sports` is derived from its fields.

## Admin (role: admin)

| Method | Path | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/admin/analytics` | – | `AdminAnalytics` | – |
| GET | `/admin/venues` | `status, q, page, pageSize` | `Paginated<VenueDetail>` | – |
| POST | `/admin/venues/:id/moderate` | `ModerateVenueDto` `{ status: approved\|rejected\|suspended, note? }` | `VenueDetail` (approve sets `verified`; reject/suspend clears `featured`) | not_found |
| POST | `/admin/venues/:id/feature` | `{ featured }` | `VenueDetail` | conflict (not approved) |
| GET | `/admin/users` | `q, role, status, page, pageSize` | `Paginated<User>` | – |
| PATCH | `/admin/users/:id/status` | `{ status: active\|suspended }` | `User` | conflict (own account) |
| GET | `/admin/reports` | `status, page, pageSize` | `Paginated<Report>` | – |
| POST | `/admin/reports/:id/resolve` | `ResolveReportDto` `{ status: resolved\|dismissed, resolution }` | `Report` | not_found |

## Checklist for the backend developer

1. Implement the tables in `DATA_MODEL.md` (including the booking exclusion constraint).
2. Implement the endpoints above with the same paths, camelCase JSON and error body.
3. Port `domain/pricing.ts`, `domain/slots.ts`, `domain/rules.ts` (the vitest file `domain/domain.test.ts` doubles as a spec with expected numbers).
4. Issue a short-lived access token and a refresh token; return `401 token_expired` when the access token is expired.
5. Enable CORS for the web origin and set `NEXT_PUBLIC_API_MODE=real`, `NEXT_PUBLIC_API_URL=...`.
6. Validate against the zod schemas: `schemas.VenueDetail.parse(response)` in a test catches any shape drift.
