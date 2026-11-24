# Data model

Source of truth for shapes: `packages/shared/src/schemas/*.ts` (zod). This file
maps them to PostgreSQL. JSON uses **camelCase**; suggested columns use
snake_case.

Conventions

- Primary keys: `uuid` (`gen_random_uuid()`).
- Timestamps: `timestamptz`, returned as ISO-8601 with the `+07:00` offset.
- Local calendar dates (`date`) and wall-clock times (`HH:mm`) are in
  **Asia/Phnom_Penh** (UTC+7, no DST).
- Money: `numeric(10,2)` in **USD**. KHR is derived for display
  (`4100 KHR = 1 USD`, rounded to 100 riel) except `total_khr`, which is stored
  on the booking so receipts never change if the rate does.

## Relations

```
users 1--1 teams (captain)                 users 1--* venues (owner)
venues 1--* fields                         fields 1--* bookings
users 1--* bookings                        fields 1--* availability_blocks
bookings 0..1--1 match_requests            match_requests 1--* join_requests
match_requests 0..1--1 conversations       conversations 1--* messages
users *--* venues  (favorites)             users 1--* notifications
reviews -> venue | team (polymorphic)      reports -> venue | user | review | match
```

## Tables

### users
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| role | text | `player` \| `owner` \| `admin` |
| name | text | 2-80 chars |
| email | citext UNIQUE | |
| phone | text | |
| password_hash | text | never returned by the API |
| avatar_url | text NULL | |
| locale | text | `en` \| `km` |
| status | text | `active` \| `suspended` |
| team_id | uuid NULL FK teams | the team this user captains |
| home_province | text | province enum |
| created_at | timestamptz | |

Indexes: `UNIQUE (email)`, `(role)`, `(status)`.

### teams
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| name | text | |
| sport | text | `football` \| `volleyball` |
| captain_id | uuid FK users | |
| level | text | `beginner` \| `intermediate` \| `advanced` |
| member_count | int | |
| color | text | hex, for the avatar |
| bio | text | |
| home_province | text | |
| matches_played, wins | int | |
| sportsmanship | numeric(2,1) | average of team reviews (denormalized) |
| sportsmanship_count | int | |
| created_at | timestamptz | |

### venues
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| owner_id | uuid FK users | |
| slug | text UNIQUE | used in URLs |
| name, name_km | text | |
| description, description_km | text | |
| province | text | `phnom_penh`, `siem_reap`, `battambang`, `sihanoukville`, `kampot`, `kampong_cham` |
| district | text | |
| address | text | |
| lat, lng | double precision | |
| sports | text[] | 1-3 sports, derived from the venue's fields |
| photos | text[] | URLs |
| amenities | text[] | amenity enum |
| opening_hours | jsonb | 7 items `{ weekday 0-6, open, close, closed }` (or a `venue_hours` table) |
| phone | text | |
| rating | numeric(2,1) | average of venue reviews (denormalized) |
| review_count | int | |
| verified, featured | boolean | |
| status | text | `pending` \| `approved` \| `rejected` \| `suspended` |
| moderation_note | text NULL | shown to the owner when rejected |
| created_at | timestamptz | |

Indexes: `UNIQUE (slug)`, `(status, province, district)`, `GIN (sports)`,
`(owner_id)`, `(featured) WHERE status = 'approved'`, optional
`GIST (ll_to_earth(lat, lng))` for distance search.

### fields
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| venue_id | uuid FK venues ON DELETE CASCADE | |
| sport | text | `football` \| `volleyball` \| `tennis` |
| name | text | "Field A" |
| position | text | "Indoor, north hall" |
| surface | text | `artificial_turf`, `natural_grass`, `futsal_court`, `sand`, `hard_court`, `clay`, `parquet` |
| indoor | boolean | |
| format | text | "5v5", "7v7", "11v11", "6v6", "Singles/Doubles" |
| max_players | int | |
| price_per_hour_usd | numeric(10,2) | off-peak rate |
| peak_price_per_hour_usd | numeric(10,2) | 17:00-22:00 rate |
| lit | boolean | |
| status | text | `active` \| `maintenance` |
| layout | jsonb NULL | `{ x, y, w, h }` in metres on the venue plan (0–400). NULL = not placed; the client auto-arranges it. Or four `numeric(6,2)` columns `layout_x/y/w/h`. |

Indexes: `(venue_id, sport)`.

Saving a layout must reject overlapping rectangles across all of the venue's
fields (shared edges are allowed). `findLayoutOverlap()` in
`packages/shared/src/domain/layout.ts` is the reference implementation.

### bookings
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| code | text UNIQUE | "PK-7F3K2Q" |
| user_id | uuid FK users | |
| venue_id | uuid FK venues | denormalized from field for fast owner queries |
| field_id | uuid FK fields | |
| sport | text | |
| date | date | local date |
| start_at, end_at | timestamptz | |
| team_size | int | |
| referee | boolean | |
| extras | jsonb | `{ waterBottles, ball, bibs }` |
| notes | text | |
| opponent_mode | text | `have` \| `find` |
| match_request_id | uuid NULL FK match_requests | |
| price | jsonb | full `PriceBreakdown` snapshot (lines, subtotal, fee, total) |
| total_usd | numeric(10,2) | copy of `price.totalUsd` for reporting |
| total_khr | int | |
| payment_method | text | `khqr` \| `aba` \| `wing` \| `cash` |
| payment_status | text | `unpaid` \| `paid` \| `refunded` |
| status | text | `pending` \| `confirmed` \| `rejected` \| `cancelled` \| `completed` |
| created_at | timestamptz | |
| cancelled_at | timestamptz NULL | |

Indexes: `(user_id, start_at DESC)`, `(field_id, start_at)`,
`(venue_id, date)`, `(status)`.

**Double-booking must be impossible at the database level.** Add an exclusion
constraint (needs `btree_gist`):

```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (field_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)
  WHERE (status IN ('pending', 'confirmed', 'completed'));
```

The range is half-open `[start, end)`: a booking ending at 19:00 does not clash
with one starting at 19:00 (same rule as `rangesOverlap` in shared code).

### availability_blocks
Owner-blocked time (maintenance, private events).

| Column | Type |
| --- | --- |
| id | uuid PK |
| field_id | uuid FK fields ON DELETE CASCADE |
| date | date |
| start_time, end_time | time |
| reason | text |

Index: `(field_id, date)`.

### match_requests
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| host_user_id | uuid FK users | |
| host_team_id | uuid FK teams | |
| sport | text | `football` \| `volleyball` |
| venue_id | uuid FK venues | |
| field_id | uuid NULL FK fields | |
| booking_id | uuid NULL FK bookings | set when the field is already booked |
| date | date | |
| start_at, end_at | timestamptz | |
| level | text | |
| team_size | int | players per side |
| cost_split | text | `split` \| `host_pays` \| `loser_pays` |
| note | text | |
| status | text | `open` \| `matched` \| `cancelled` \| `expired` |
| created_at | timestamptz | |

Indexes: `(status, start_at)`, `(sport, status)`, `(host_user_id)`.

### join_requests
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| match_request_id | uuid FK match_requests ON DELETE CASCADE | |
| user_id | uuid FK users | |
| team_id | uuid FK teams | |
| message | text | |
| status | text | `pending` \| `accepted` \| `declined` |
| created_at | timestamptz | |

Constraints: `UNIQUE (match_request_id, user_id)`; at most one `accepted` row
per match (`UNIQUE (match_request_id) WHERE status = 'accepted'`).

### conversations / conversation_participants / messages
| Table | Columns |
| --- | --- |
| conversations | id, kind (`match` \| `venue` \| `support`), title, match_request_id NULL, created_at |
| conversation_participants | conversation_id, user_id, last_read_at — PK (conversation_id, user_id) |
| messages | id, conversation_id FK, sender_id FK users, body, created_at — index `(conversation_id, created_at)` |

`unreadCount` = messages from others newer than `last_read_at`.

### reviews
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| target_type | text | `venue` (venue rating) \| `team` (opponent sportsmanship) |
| target_id | uuid | venue id or team id |
| author_id | uuid FK users | |
| booking_id | uuid NULL FK bookings | |
| rating | smallint | 1-5 |
| comment | text | |
| created_at | timestamptz | |

Indexes: `(target_type, target_id, created_at DESC)`, `(author_id)`,
`UNIQUE (booking_id, author_id, target_type) WHERE booking_id IS NOT NULL`.
After insert, recompute `venues.rating/review_count` or
`teams.sportsmanship/sportsmanship_count`.

### favorites
`(user_id, venue_id)` PK, `created_at`.

### notifications
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK users | |
| type | text | `booking_confirmed`, `booking_pending`, `booking_rejected`, `booking_cancelled`, `booking_rescheduled`, `join_request`, `join_accepted`, `join_declined`, `message`, `venue_approved`, `venue_rejected`, `review`, `system` |
| params | jsonb | values interpolated into the localized text on the client |
| href | text | app-relative path to open |
| read | boolean | |
| created_at | timestamptz | |

Index: `(user_id, read, created_at DESC)`.

### reports
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| reporter_id | uuid FK users | |
| target_type | text | `venue` \| `user` \| `review` \| `match` |
| target_id | uuid | |
| reason | text | `wrong_info`, `unsafe`, `no_show`, `abusive`, `scam`, `other` |
| details | text | |
| status | text | `open` \| `resolved` \| `dismissed` |
| resolution | text NULL | |
| created_at | timestamptz | |

Index: `(status, created_at DESC)`.

## Business rules the backend must reproduce

All of these are implemented and unit-tested in `packages/shared/src/domain`.
Port them 1:1 (or call the same numbers from `APP` in `config.ts`).

| Rule | Value |
| --- | --- |
| Slot length | 30 minutes; bookings are 60-240 minutes, aligned to slots |
| Booking window | today .. today + 30 days |
| Peak rate | slots starting 17:00-21:59 use `peak_price_per_hour_usd` |
| Weekend surcharge | +10% of the field amount on Saturday and Sunday |
| Referee | $5 per hour (not offered for tennis) |
| Extras | water $0.50 per bottle, ball $2, bibs $3 (football only) |
| Service fee | 3% of the subtotal |
| KHR | `round(usd * 4100 / 100) * 100` |
| Initial state | online payment -> `confirmed` + `paid`; cash -> `pending` + `unpaid` until the owner accepts |
| Cancel / reschedule | allowed while `pending`/`confirmed` and at least 2 hours before start; paid bookings become `refunded` |
| Slot is taken when | a booking in `pending`/`confirmed`/`completed` or an availability block overlaps `[start, end)` |
| Matching | football and volleyball only; accepting one join request declines the others, sets the match to `matched` and opens a conversation |
| Completed | a booking whose `end_at` has passed is `completed` (run a scheduled job; the mock seeds it) |

### refresh_tokens (apps/api)
| Column | Type | Notes |
| --- | --- | --- |
| token_hash | text PK | sha-256 of the refresh token; the token itself is never stored |
| user_id | uuid FK users ON DELETE CASCADE | |
| expires_at | timestamptz | 30 days; each token works once (rotation on refresh) |

### telegram_links (apps/api)
| Column | Type | Notes |
| --- | --- | --- |
| user_id | uuid PK FK users | the venue owner |
| chat_id | bigint NULL | set when the owner presses Start in the bot |
| link_code | text UNIQUE | one-time code in `t.me/<bot>?start=<code>`; replaced after use |

The full, runnable schema (constraints included) is
`apps/api/src/db/migrations/0001_init.sql`.

### payments (apps/api)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| booking_id | uuid FK bookings | |
| provider | text | `sandbox` until a real provider is configured |
| method | text | `khqr` / `aba` / `wing` |
| reference | text UNIQUE | the id the provider sends back in its webhook |
| amount_usd, amount_khr | numeric / int | frozen from the booking price |
| status | text | `pending` / `paid` / `expired` |
| qr_payload, deeplink | text NULL | what the player scans or opens |
| expires_at, paid_at | timestamptz | |

`bookings` also has `payment_due_at` (online payments) and the status
`awaiting_payment`; the no-overlap constraint covers `awaiting_payment`,
`pending` and `confirmed`.

### password_resets (apps/api)
`token_hash` (sha-256, PK), `user_id`, `expires_at` (30 min). Deleted on use.

### teams, match_requests, join_requests, conversations, messages, reviews (apps/api)
Same columns as the shapes in `schemas/user.ts`, `match.ts`, `chat.ts` and
`misc.ts`. `join_requests` is unique per (match, player); `reviews` is unique per
(booking, author, target type). Conversations keep `participant_ids uuid[]` and
`read_at jsonb` ({ userId: last read time }). Full SQL in
`apps/api/src/db/migrations/`.

