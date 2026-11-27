# Portfolio kit: PitchKH

Everything needed to add PitchKH to the portfolio (Danish_portfolio), shaped like the Bookly
case study. Captured from the real app running locally with made-up demo data on 27 Nov 2026.

![Cover](cover/card.jpg)

**Phone only.** PitchKH is phone first (most customers book inside Telegram), so every screen
is a phone shot and there are no laptop shots. **New cover style ("match day")**, not the
Bookly or Diabetes style: mowed grass with white pitch lines, the app's red/white krama band,
three phones fanned out, and the real Telegram alert staff get for a new booking.

## What's here

| Path | What it is | Size |
| --- | --- | --- |
| `cover/card.webp` | Project card cover (16:10), with title, Khmer line and 3 facts | 3200×2000 |
| `cover/banner.webp` | Wide banner for the top of the case study (2.4:1), no title | 3840×1600 |
| `cover/*.jpg` | Same covers at half size, for LinkedIn, README or slides | |
| `cover/cover.source.html` | Source of both covers (`?mode=card` / `?mode=banner`) | |
| `cover/overview.source.html` | Source of `overview.jpg` | |
| `cover/render.cjs` | Re-renders the covers and overview (run from `apps/web`: `node ../../portfolio/cover/render.cjs`) | |
| `screens/*.webp` | 13 phone screens, in user-flow order | 516×1118 |
| `pitchkh.portfolio.ts` | Ready-to-paste entry: pitch, facts, problem, what I built, screens, stats, future plan | |
| `overview.jpg` | The whole user flow on one page | 2000 wide |

The phone size matches the Bookly phone screenshots already in the portfolio.

## The story (also in `pitchkh.portfolio.ts`)

**Pitch.** Book a football, volleyball or tennis pitch in a minute: pick a time, tap a free
pitch on the map, and get confirmed on Telegram. No account needed.

**The problem.** Pitches in Phnom Penh are booked by phone calls and Facebook messages.
Players can't see what's free, staff juggle chats and a paper sheet, and double bookings happen.

**What I built.** A booking app that shows every free pitch on a map of the venue, takes a
request in a minute without sign-up, and sends it straight to staff on Telegram, with a day
timeline to run each branch.

**Facts row:** Solo, full-stack · Web · Telegram Mini App · English · ខ្មែរ · 3 branches · 24 pitches

**Stats** (checked against the code): 24 pitches on the map · 3 branches ·
104 automated tests (71 app + 33 shared, all passing) · 241 strings in both English and Khmer.

**Future development plan**
- Pay online with Bakong KHQR when booking
- Reminders on Telegram before the game
- Repeat bookings for teams that play every week
- Reports for the owner: busy hours and income per branch

## The user flow

![User flow](overview.jpg)

### Customer: book a pitch in a minute (no account)

| # | Screen | File | What happens |
| --- | --- | --- | --- |
| 01 | Home | `home` | The promise in three steps: pick a time and pitch, add your name, get confirmed on Telegram. |
| 02 | Pick a branch | `branches` | Three branches. Each card shows "Open now", hours, sports and the lowest price. Tap **Book**. |
| 03 | Branch page | `branch` | Branch name, address, hours and **Directions** (Google Maps). Step 1 starts: the day. |
| 04 | Day and time | `time` | Pick a day (14 days ahead) and a length (1h, 1h30, 2h, 3h). Each start time says how many pitches are still free. |
| 05 | Pitch on the map | `map` | A top-down plan of the venue: football fields, the indoor hall, volleyball and tennis courts. Free pitches are green, taken ones dark. Tap one; the bar at the bottom shows the pick and the price in $ and riel. Tap **Continue**. |
| 06 | Your details | `form` | Name, phone and number of players (an optional note). No sign-up, no password. **Send booking**. |
| 07 | Request sent | `sent` | The pitch is held as "Waiting for confirmation", with a booking code (e.g. PK-JASPY) and the price, paid at the venue. |

### Staff: confirm it from Telegram

| # | Screen | File | What happens |
| --- | --- | --- | --- |
| — | Telegram alert | (on the cover and overview) | The bot messages branch staff: booking code, branch and pitch, time, players, price, with **Chat** and **Open bookings** buttons. |
| 08 | Waiting for you | `staff` | **Open bookings** opens the staff screen inside Telegram. New requests are on top: Confirm, Decline, Call, or Chat by phone. |
| 09 | Day timeline | `schedule` | Every pitch of a branch on one timeline, per day. Brown is waiting, green is confirmed. A free slot can be tapped to add a walk-in. |
| 10 | Booking details | `sheet` | Tap a booking: status, pitch, time, phone, players, price, and whether it came from the app or from staff. Cancel, call or chat. |
| 11 | Walk-ins | `add` | Staff add phone and walk-in bookings, saved as confirmed at once. |

When staff confirm or cancel, a customer who booked through the Telegram Mini App gets a
Telegram message.

### Both

| # | Screen | File | What it shows |
| --- | --- | --- | --- |
| 12 | In Khmer | `home-km` | Every screen in Khmer with one tap (ខ្មែរ in the header). |
| 13 | Dark mode | `map-dark` | The map and pickers in dark mode. |

## Adding it to the portfolio

1. Copy `screens/*.webp` into `src/assets/projects/pitchkh/`, and `cover/card.webp` +
   `cover/banner.webp` next to the other covers.
2. Add the `pitchkh` image lookup to `src/lib/assets.ts` (the exact lines are at the top of
   `pitchkh.portfolio.ts`).
3. In `src/content/portfolio.ts`:
   - add `"pitchkh"` to `Project["id"]`;
   - make the screen's `desktop` optional: `desktop?: string;` (this case study is phone only);
   - paste `pitchkhProject` into `PROJECTS` and map each `phone` name through the lookup,
     e.g. `phone: ASSETS.projects.pitchkhShot("map")`.
4. In `BooklyCaseStudy.tsx` (or the shared case-study component), when a screen has no
   `desktop`, show only the phone, centred. Hide the "How I built it" blocks when their lists
   are empty, so no empty headings show.
5. `ProjectCover.tsx` has a theme per project id. Add `pitchkh` in the app's own green:
   `stage: "bg-[radial-gradient(120%_90%_at_15%_10%,#0d8a53_0%,#0a6a40_45%,#04301c_100%)]"`,
   `dot: "bg-[#ffc629]"` (app colours: green `#0a7446`, yellow `#ffc629`, krama red `#c2242b`).
   Or simply use `cover/card.webp` as the PitchKH cover image.
6. Check the live link (`https://pitchkh.vercel.app/`) still opens before publishing. It
   couldn't be reached from the machine that made this kit.

## Notes

- All names, phone numbers and bookings in the screenshots are made-up demo data, entered into
  the app's in-memory store (no database, no real customers).
- The Next.js dev badge and the demo notice are hidden in the screenshots; motion is reduced
  so nothing is caught mid-animation.
- **Your role, honestly:** the facts row says "Solo, full-stack". The git history shows the
  code was written in Claude Code sessions. If you want to say so, use "Solo · built with
  AI pair programming" in the Role fact and summary.
- The Telegram alert on the cover uses the exact wording of `apps/web/src/server/notify.ts`,
  filled in with the demo booking from the screenshots (PK-JASPY, Field B, Sat Nov 28).
