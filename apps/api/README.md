# PitchKH API (v1)

The real backend for PitchKH: **Node + TypeScript, Hono, PostgreSQL, Drizzle**.
It implements `docs/API_CONTRACT.md` for v1: accounts, venues, the pitch map,
bookings, owner management, admin, notifications and **Telegram alerts for owners**.
Matches, chat and reviews are v1.1 (the web app hides them on this API).

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

## Deploy (suggested)

- **Database:** Neon, Railway or Render PostgreSQL 16. Run `node dist/migrate.js` on each deploy.
- **API:** build with `pnpm api:build`, start with `node apps/api/dist/main.js`
  (`NODE_ENV=production`). Works on Railway, Render or Fly.
- **Web:** Vercel, with `NEXT_PUBLIC_API_MODE=real` and `NEXT_PUBLIC_API_URL=https://<your-api>/api/v1`.
  Add the web origin to the API's `CORS_ORIGINS`.

## v1.1 next

Matches + chat, reviews, online payment (KHQR / ABA PayWay webhooks), photo
upload for venues, password reset by email or SMS.
