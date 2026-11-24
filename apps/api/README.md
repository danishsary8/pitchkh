# PitchKH API (v1)

The real backend for PitchKH: **Node + TypeScript, Hono, PostgreSQL, Drizzle**.
It implements all of `docs/API_CONTRACT.md`: accounts (with password reset),
venues, the pitch map, bookings, **online payments**, owner management (with
photo upload), admin, notifications, **Telegram alerts for owners**, teams,
matches, chat and reviews.

## Run it locally

You need Node 20+, pnpm 10 and PostgreSQL 16 (Docker is easiest).

1. Start PostgreSQL (creates `pitchkh` and `pitchkh_test`):

   ```bash
   docker compose up -d
   ```

2. Create your env file:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

3. Create the tables, then load the demo data (same venues and accounts as the mock):

   ```bash
   pnpm db:migrate
   ```

   ```bash
   pnpm db:seed
   ```

4. Start the API on http://localhost:8000/api/v1:

   ```bash
   pnpm api:dev
   ```

5. Point the web app at it. In `apps/web/.env.local`:

   ```bash
   NEXT_PUBLIC_API_MODE=real
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

   Then `pnpm dev` and sign in with a demo account (password `password`).

`pnpm db:seed` empties every table first. It is for development only.

## Test it

```bash
pnpm api:test
```

The tests boot the API against `pitchkh_test` with a frozen clock and call it
through **the web app's own API client** in real mode, so they prove the server
and the frontend agree. Highlights:

- the full booking lifecycle (create, clash, reschedule, cancel, refund)
- **10 players booking the same slot at the same time: exactly 1 wins**, 9 get `409 slot_unavailable`
- roles: players can't reach owner/admin endpoints; owners only see their own venues
- the pitch map: save, overlap rejected
- Telegram: link with `/start <code>`, alert on a cash request, Accept from the button
- payments: signed webhook confirms once, unpaid holds release after 10 minutes, late payments refunded
- password reset (single-use link, old sessions end) and photo upload (fake images refused)
- match board: post, join, accept one team, chat between captains; reviews update ratings

Every response is checked against the shared zod schemas.

## How it is built

```
src/
  main.ts          starts the server (reads .env)
  app.ts           Hono app: CORS, error shape, /health, mounts /api/v1
  http.ts          route(method, path, access, handler), auth, notifications
  views.ts         read models: load the rows, run the shared summary logic
  telegram.ts      Telegram bot client and alert messages (EN/KM)
  auth/tokens.ts   JWT access tokens + rotating refresh tokens
  routes/          auth, venues, bookings, notifications, owner, admin, telegram
  db/              schema.ts, migrations/*.sql, migrate.ts, seed.ts, mappers.ts
```

Each file in `routes/` matches its twin in `packages/shared/src/mock/handlers/`,
with SQL instead of in-memory arrays. Rules (prices, slots, cancellation) come
from `packages/shared/src/domain`, so the mock and the API can't drift apart.

**Double booking** is stopped by the database itself:

```sql
CONSTRAINT bookings_no_overlap EXCLUDE USING gist (field_id WITH =, tstzrange(start_at, end_at) WITH &&)
  WHERE (status IN ('pending', 'confirmed'))
```

The API also checks availability first (for a friendly error), but the
constraint is what holds when two requests arrive at the same moment.

## Environment variables

| Name | Required | What |
| --- | --- | --- |
| `DATABASE_URL` | yes (prod) | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | yes (prod) | Long random string (`openssl rand -base64 48`) |
| `PORT` | no | Default 8000 |
| `CORS_ORIGINS` | no | Web app origins, comma-separated. Default `http://localhost:3000` |
| `WEB_URL` | yes (prod) | The web app's URL, for password reset links |
| `PUBLIC_URL` | yes (prod) | This API's public URL, for photo links |
| `STORAGE` | no | Venue photos: `local` (default) or `r2` (Cloudflare R2; use this on hosts that wipe the disk) |
| `UPLOAD_DIR` | no | With `local`: where photos are saved (default `uploads`). Needs a persistent disk in production |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | with `r2` | The bucket, an Object Read & Write token, and the bucket's public URL. See docs/SETUP_CHECKLIST.md step 3 |
| `RESEND_API_KEY`, `MAIL_FROM` | for email | Without a key, emails are printed to the log |
| `PAYMENT_PROVIDER` | no | `sandbox` (only option until real keys) |
| `PAYMENT_WEBHOOK_SECRET` | yes (prod) | Random string; checks the provider's webhook signature |
| `TELEGRAM_BOT_TOKEN` | for alerts | From @BotFather |
| `TELEGRAM_BOT_USERNAME` | for alerts | The bot's username, without `@` |
| `TELEGRAM_WEBHOOK_SECRET` | for alerts | Random string; Telegram echoes it on every webhook call |

## Telegram alerts

1. Create a bot with [@BotFather](https://t.me/BotFather) and put its token and username in `.env`.
2. Deploy the API on HTTPS, then register the webhook once (replace the values):

   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-api>/api/v1/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

3. Owners open **Dashboard → Booking alerts on Telegram → Connect Telegram** and press Start in the bot.

Without these variables the API runs normally and the dashboard card is hidden.

## Deploy

Everything is prepared; you only need accounts.

**API + database on Render (one click):** `render.yaml` at the repo root
describes the API (Docker, `apps/api/Dockerfile`) and a PostgreSQL 16 database.
In Render: **New → Blueprint → this repo**. It generates `JWT_SECRET` and the
webhook secrets; you fill in `CORS_ORIGINS` (your Vercel URL) and, for
Telegram, the bot token and username. The container runs migrations on every
start, then serves on port 8000 with a `/health` check.

**Any other Docker host (Railway, Fly, a VPS):**

```bash
docker build -f apps/api/Dockerfile -t pitchkh-api .
```

```bash
docker run -p 8000:8000 -e DATABASE_URL=... -e JWT_SECRET=... -e CORS_ORIGINS=https://your-web.app pitchkh-api
```

**Web on Vercel:** import the repo, set Root Directory to `apps/web`, and add
`NEXT_PUBLIC_API_MODE=real` and `NEXT_PUBLIC_API_URL=https://<your-api>/api/v1`.

**CI:** `.github/workflows/ci.yml` runs typecheck, lint, tests, the web build
and the API tests on a real PostgreSQL for every push.

Load demo data on a fresh deploy only if you want it (it empties every table):
`node dist/seed.js` in the API container.

## Bakong KHQR (real payments)

Set `PAYMENT_PROVIDER=bakong` with `BAKONG_TOKEN` and `BAKONG_ACCOUNT_ID`
(`src/bakong.ts`). The API makes a dynamic KHQR for the exact USD amount, with
the booking code as bill number, that expires with the hold. Bakong has no
webhook, so the API asks `check_transaction_by_md5` while the player waits
(each poll, at most every 3 s) and every 10 s in the background. A payment
only counts if the amount and the receiving account match.

## Plugging in another payment provider

`src/payments.ts` defines `PaymentProvider` with two methods: `createIntent`
(returns the KHQR string or app link plus a `reference`) and `verifyWebhook`
(checks the provider's signature and returns the paid `reference`). Write one
for Bakong KHQR or ABA PayWay with your merchant keys, select it with
`PAYMENT_PROVIDER`, and point the provider's callback at
`/api/v1/payments/webhook`. Everything else (holds, expiry, refunds,
notifications, the web app's QR sheet) already works.

## Next

Going live (docs/SETUP_CHECKLIST.md) and the mobile app.
