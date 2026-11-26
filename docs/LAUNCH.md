# Launch checklist (version 1)

Version 1 does one job: customers book a pitch at one of 3 branches, with no account, and
staff confirm it. Everything runs on Vercel plus a free Neon Postgres database. Telegram
is both the customer app (Mini App) and the staff login.

## How it works

- **Customers** open the bot (or the website), pick a branch, a day, a start time and a pitch
  on the map, then type their name and phone. The booking is saved as *waiting*, and the
  slot is held so nobody else can take it.
- **Staff** get a Telegram message from the bot for every new request, with a button that
  opens `/admin`. There they confirm or decline, see each branch's day on a timeline, and
  add walk-in or phone bookings.
- **The customer** gets a bot message when the booking is confirmed or cancelled (if they
  booked inside Telegram).
- **No passwords:** Telegram signs who opened the Mini App, and the server only lets the
  IDs in `ADMIN_TELEGRAM_IDS` into `/admin`.
- **No double bookings:** the database itself rejects two live bookings on the same pitch
  at overlapping times.

## Your setup, in order (about 30 minutes)

### 1. Create the bot (@BotFather)
1. Send `/newbot`. Name it "PitchKH", and give it a username ending in `bot`.
2. Copy the **token** it gives you. Keep it secret.
3. Send `/mybots`, pick your bot, then Bot Settings → Configure Mini App → Enable Mini App.
   Set the URL to `https://pitchkh.vercel.app/en`.
4. Bot Settings → Menu Button: same URL, with the text "Book a pitch".

### 2. Create the database
In Vercel, open your project → **Storage** → Create → **Neon** (free) → connect it to the
project. Vercel adds `DATABASE_URL` for you. The table is created automatically on first use.
`apps/web/db/schema.sql` shows what it creates.

### 3. Set environment variables
Go to Vercel → project → Settings → Environment Variables (Production and Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | added by step 2 |
| `TELEGRAM_BOT_TOKEN` | the token from step 1 |
| `ADMIN_TELEGRAM_IDS` | your Telegram ID (step 5), plus any staff IDs, separated by commas |
| `NEXT_PUBLIC_OWNER_TELEGRAM` | your Telegram username, without @ (for "Chat with us") |
| `NEXT_PUBLIC_SITE_URL` | `https://pitchkh.vercel.app` (or your own domain later) |

### 4. Deploy
Set the production branch to `main` (Settings → Environments → Production → Branch
Tracking), then merge `develop` into `main`. Vercel deploys it.

### 5. Find your Telegram ID and unlock /admin
1. In Telegram, open your bot and tap the menu button.
2. Change the address to `/en/admin`: the screen shows "Staff only" and **your Telegram ID**.
   You can also message @userinfobot to get it.
3. Put that number in `ADMIN_TELEGRAM_IDS`, then redeploy (Deployments → ⋯ → Redeploy).
4. You only need to open `/admin` once: after that, each new-booking message has an
   "Open bookings" button. Before that first message arrives, the bot has to be allowed
   to message you, so **press Start in your bot** once.

### 6. Test it end to end
1. Open `https://pitchkh.vercel.app/api/health`. It should show `"ok": true`, `"database": "postgres"`,
   `"bot": true` and `"admins"` ≥ 1.
2. On a phone, book a pitch through the bot. You should get a Telegram message.
3. Tap "Open bookings", then Confirm. The customer (you) gets a "Booking confirmed" message.
4. Try booking the same pitch and time again: it must say the time was just taken.

### 7. Put in the real details
Edit `apps/web/src/lib/branches.ts`: names, addresses, Google Maps links, opening hours,
pitches and prices. Replace the photos in `apps/web/public/assets/venues/`. Or send the
details to Claude and ask it to do this.

## Running it well

- **Uptime:** add `https://pitchkh.vercel.app/api/health` to a free monitor such as
  UptimeRobot (every 5 minutes, alert on non-200).
- **Logs:** Vercel → project → Logs. Every booking and status change is one JSON line
  (`booking_created`, `booking_status`, `telegram_send_failed` and so on).
- **Backups:** Neon keeps a restore window (point-in-time restore) on every plan. Check the
  length under the Neon project → Settings.
- **Safe changes:** work on `develop` (each push gets a preview link), check the preview,
  then merge into `main`. To undo a bad release, open Vercel → Deployments, pick the
  previous one and choose "Promote to Production" (instant rollback).
- **Secrets:** if the bot token leaks, send `/revoke` in @BotFather, then put the new token
  in Vercel and redeploy.
- **Staff changes:** edit `ADMIN_TELEGRAM_IDS` and redeploy.

## Local development

```bash
pnpm install
pnpm dev
```

Without `DATABASE_URL` and `TELEGRAM_BOT_TOKEN`, bookings live in memory and `/admin` is open
on your own machine, so you can try everything locally. `pnpm check` runs the translation
check, types, lint, tests and the build (CI runs the same on every push).
