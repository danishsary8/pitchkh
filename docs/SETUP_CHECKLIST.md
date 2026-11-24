# Go-live checklist (your part)

Everything in the code is done. These are the steps that need **your accounts
and keys**. Do them in order; each takes a few minutes. Never paste keys into
chat or commit them: they go only into the hosting dashboards.

## 1. Accounts to create

| Service | Why | Free? |
| --- | --- | --- |
| [Render](https://render.com) | API + PostgreSQL database | Free plan works to start |
| [Vercel](https://vercel.com) | The web app | Yes |
| [@BotFather](https://t.me/BotFather) in Telegram | Owner booking alerts | Yes |
| [Resend](https://resend.com) | Password reset emails | Yes (verify a sending domain) |
| Bakong Open API | Real KHQR payments | You already have a token |
| [Cloudflare R2](https://dash.cloudflare.com) | Venue photos (Render's free disk is wiped on redeploy) | Yes, 10 GB free |

## 2. Bakong (payments)

1. Decide which Bakong account receives the money, e.g. `yourname@aclb`.
   You can reuse the token from your other project. Use a **different account
   ID** if you want this project's money kept separate.
2. You'll paste these into Render in step 4:
   - `PAYMENT_PROVIDER` = `bakong`
   - `BAKONG_TOKEN` = your Open API token (renew it about every 90 days, in both projects)
   - `BAKONG_ACCOUNT_ID` = e.g. `yourname@aclb`
   - `BAKONG_MERCHANT_NAME` = what payers see, e.g. `PitchKH` (max 25 characters)
3. Bakong may only accept API calls from some regions. If payments stay
   "waiting" after paying, check the API logs for `Bakong check failed`, and
   ask NBC or move the API to a host they allow.

## 3. Cloudflare R2 (venue photos)

Render's free disk is wiped on every redeploy, so photos live in an R2 bucket.

1. Cloudflare dashboard → **R2** → **Create bucket**, e.g. `pitchkh-photos`.
2. Bucket → **Settings → Public access**: turn on the **r2.dev subdomain**
   (or connect a custom domain such as `photos.yourdomain.com`). Copy that URL.
3. R2 → **Manage API tokens → Create API token**: permission **Object Read & Write**,
   only for this bucket. Copy the **Access Key ID** and **Secret Access Key**
   (the secret is shown once). Your **Account ID** is on the R2 overview page.
4. You'll paste these into Render in step 4 (`STORAGE` is already `r2` in `render.yaml`):
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET` = e.g. `pitchkh-photos`
   - `R2_PUBLIC_URL` = the public URL from point 2 above, e.g. `https://pub-xxxx.r2.dev`
5. And into Vercel in step 5: `NEXT_PUBLIC_PHOTOS_URL` = the same public URL.

## 4. Render (API + database)

1. Render → **New → Blueprint** → pick this GitHub repo. It reads `render.yaml`.
2. Fill in the empty settings it asks for:
   - `CORS_ORIGINS` and `WEB_URL` = your Vercel URL (you get it in step 5; you can come back)
   - `PUBLIC_URL` = the API's Render URL, e.g. `https://pitchkh-api.onrender.com`
   - the Bakong values from step 2
   - `RESEND_API_KEY` (step 7), `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` (step 6)
   - the R2 values from step 3
3. Deploy. Open `https://<your-api>/health`: it should say `{"ok":true}`.
4. Optional demo data (for a test/staging site only): in the Render shell run
   `ALLOW_DEMO_SEED=1 node dist/seed.js` (**it empties every table** and creates demo logins
   with the password `password`, so never on the real production database).

## 5. Vercel (web app)

1. Vercel → **Add New → Project** → this repo. **Root Directory: `apps/web`**.
2. Environment variables:
   - `NEXT_PUBLIC_API_MODE` = `real`
   - `NEXT_PUBLIC_API_URL` = `https://<your-api>/api/v1`
   - `NEXT_PUBLIC_PHOTOS_URL` = the R2 public URL from step 3
3. Deploy, then put the Vercel URL into Render's `CORS_ORIGINS` and `WEB_URL`.

## 6. Telegram bot

1. In @BotFather: `/newbot`, pick a name. Copy the **token** and the bot **username**.
2. Put them in Render (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`). Render
   already generated `TELEGRAM_WEBHOOK_SECRET`: copy its value.
3. Register the webhook once (fill in the three values):

   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-api>/api/v1/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

4. As an owner: Dashboard → **Connect Telegram** → press Start.

## 7. Email (Resend)

1. Add and verify your domain in Resend, create an API key.
2. Render: `RESEND_API_KEY` = the key, `MAIL_FROM` = e.g. `PitchKH <no-reply@yourdomain.com>`.
3. Test: sign-in page → **Forgot password?**

## 8. Final test (10 minutes)

- [ ] Register a player, book a pitch with **KHQR**, scan with your banking app,
      pay a small amount: the booking turns **confirmed** by itself.
- [ ] As the owner, you get the Telegram alert.
- [ ] Book with **cash**: Accept it from the Telegram button.
- [ ] Upload a venue photo, redeploy the API, and check the photo is still there; reset a password by email.
- [ ] Post a match from a second account and chat.

If something fails, the API logs in Render say why (missing setting, Bakong
check failed, email failed...).
