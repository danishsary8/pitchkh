# Running PitchKH in production

How to keep the live site healthy once it is set up ([`SETUP_CHECKLIST.md`](SETUP_CHECKLIST.md)).
The web app runs on Vercel, the API and database on Render.

## Is it up?

- **API:** `https://<your-api>/health` → `{"ok":true,"db":"up"}`. A `503` with `"db":"down"` means
  the API runs but cannot reach PostgreSQL. Render calls this every few seconds and restarts the
  service when it keeps failing.
- **Web:** open the site; Vercel shows each deploy's status.

## Reading the logs

Render → the API service → **Logs**. Every line is JSON, for example:

```json
{"time":"2026-11-25T03:36:02.364Z","level":"info","msg":"request","requestId":"cb7f5ae1-…","method":"POST","path":"/api/v1/auth/login","status":200,"ms":95}
```

- `level`: `info` (normal), `warn` (a 4xx answer, or something skipped), `error` (needs a look).
- **A user reports an error:** every API response has an `X-Request-Id` header. Search the logs
  for that ID: the request line and any `unhandled error` line (with its stack) share it.
- Health checks are not logged, so they don't bury real traffic.

### Messages worth knowing

| Log message | What it means | What to do |
| --- | --- | --- |
| `unhandled error` | A bug: the user got `500 server_error` | Read the `error` stack, fix, redeploy |
| `health check failed` | Database unreachable | Check the database in Render (status, plan limits) |
| `payment check failed` | Asking Bakong if a KHQR was paid failed | Usually an expired `BAKONG_TOKEN` (renew about every 90 days) or Bakong refusing the server's region |
| `payment job failed` | The background payment check crashed | Read the `error`; payments stay pending until it works again |
| `telegram alert failed` | An owner alert didn't send | Check `TELEGRAM_BOT_TOKEN` and the webhook. Bookings themselves are not affected |
| `email not sent: RESEND_API_KEY is not set` | Password reset emails are off | Set `RESEND_API_KEY` |
| `reset email failed` | Resend refused the email | Check the Resend dashboard (domain verified? key valid?) |
| `R2 delete failed` | A removed photo stayed in the bucket | Harmless (costs a little storage); check the R2 token if it repeats |
| `releasing expired holds failed` | Unpaid bookings aren't giving their slots back | Database problem; check `/health` |

### Users hitting limits (429)

Sign-in, sign-up and password reset are rate limited (the numbers are in
[`API_CONTRACT.md`](API_CONTRACT.md#errors)). A user who sees "Too many attempts" just waits;
the `Retry-After` header says how long. The counters live in the API's memory, so a
redeploy also resets them. If you ever run **more than one API instance**, move the
counters to PostgreSQL or Redis (`apps/api/src/rate-limit.ts`).

## Deploys

- Push to the branch Render and Vercel watch. The API image runs pending **migrations on start**
  (`node dist/migrate.js`), then serves.
- On redeploy the API gets `SIGTERM`: it stops taking new requests, finishes the ones in flight,
  closes the database pool and exits (`shutting down` → `stopped` in the logs).
- **Rolling back:** redeploy the previous commit in Render. Migrations only add things, so the
  older code keeps working with the newer database. Never edit a migration that already ran;
  add a new one.

## Backups

Your bookings and payments live only in PostgreSQL, so back it up:

1. Use a database plan with **automatic daily backups** (check your Render plan; free databases
   are not meant for real data, so read Render's current terms before you rely on one).
2. Also keep your own copy now and then, from your computer (the connection string is in
   Render → database → **External Database URL**):

   ```bash
   pg_dump --no-owner --format=custom "$DATABASE_URL" -f pitchkh-$(date +%F).dump
   ```

3. Restore into an empty database (test this once, so you know it works):

   ```bash
   pg_restore --no-owner --clean --if-exists -d "$DATABASE_URL" pitchkh-2026-11-25.dump
   ```

Venue photos are in Cloudflare R2, which keeps them across deploys.

## Rotating keys

Change a key in the Render (or Vercel) dashboard; the service redeploys with it.

| Key | When | Effect of changing it |
| --- | --- | --- |
| `BAKONG_TOKEN` | Before it expires (about every 90 days) | None for users |
| `JWT_SECRET` | If it may have leaked | Everyone is signed out once |
| `PAYMENT_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET` | If leaked | Re-register the Telegram webhook with the new secret |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | If leaked, or yearly | None (create the new token first, then delete the old) |
| `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN` | If leaked | None for users |

Never put keys in code, commits, screenshots or chat.

## When something breaks: a short routine

1. Check `/health` and the latest deploy (did it start right after a push?).
2. Search the logs for `"level":"error"` around the time of the report, or for the user's request ID.
3. If the last deploy caused it, roll back first, then fix.
4. Write down what happened and what you changed, so it doesn't happen twice.
