/**
 * PitchKH: portfolio entry, ready to paste.
 *
 * Shaped like the Bookly entry in Danish_portfolio/src/content/portfolio.ts
 * (same `Project` + `CaseStudy` fields), so it drops in next to it.
 * The "How I built it" parts (steps, practices, challenges, lessons) are left
 * empty on purpose.
 *
 * PHONE ONLY: this project is phone first (customers book inside Telegram), so
 * every screen is a phone shot (430×932 at 1.2×, saved 516×1118). There is no
 * laptop shot. See README.md, "Adding it to the portfolio", for the small
 * change that lets a case study show phone-only screens.
 *
 * Every number below was checked against the code on 27 Nov 2026:
 *   3 branches × 8 pitches = 24 pitches (apps/web/src/lib/branches.ts)
 *   3 sports: football, volleyball, tennis
 *   104 tests passing: 71 in apps/web + 33 in packages/shared (pnpm -r test)
 *   241 strings in both en.json and km.json (packages/shared/src/i18n)
 *   6 REST endpoints (README "REST API" table)
 *   bookings open 14 days ahead, 1h / 1h30 / 2h / 3h slots (booking-rules.ts)
 */

// 1) In src/lib/assets.ts, next to the Bookly glob:
//
//   const pk = import.meta.glob("@/assets/projects/pitchkh/*.webp", {
//     eager: true,
//     import: "default",
//   }) as Record<string, string>;
//   const pitchkh = (name: string) => pk[`/src/assets/projects/pitchkh/${name}.webp`] ?? "";
//
//   and inside ASSETS.projects:
//     pitchkhShot: pitchkh,
//
// 2) Copy portfolio/screens/*.webp into src/assets/projects/pitchkh/
//    and portfolio/cover/card.webp + banner.webp wherever the covers live.
//
// 3) Add "pitchkh" to Project["id"], and make `desktop` optional in CaseStudy.screens
//    (phone-only screens). "Customer" | "Staff" groups already exist for Bookly.

export const pitchkhProject = {
  id: "pitchkh",
  title: "PitchKH",
  coverLine: "Book a pitch in Phnom Penh in a minute",
  kind: "Sports booking · Telegram Mini App",
  summary:
    "A phone-first booking app for a sports business with three branches in Phnom Penh. Customers pick a time and tap a free pitch on a map of the venue, with no account. Staff get the request on Telegram and confirm it in one tap. English and Khmer, light and dark.",
  highlights: [
    "Pick a pitch on a top-down map of the venue",
    "No sign-up: works on the web and as a Telegram Mini App",
    "Staff confirm from a Telegram alert; Mini App customers hear back there",
  ],
  stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "PostgreSQL", "Telegram Bot API"],
  hosting: "Vercel · Neon",
  liveUrl: "https://pitchkh.vercel.app/",
  githubUrl: "https://github.com/danishsary8/pitchkh",
  team: false,
  imageAlt: "PitchKH on a phone: picking Field B on the venue map, the staff timeline and the request-sent ticket",

  caseStudy: {
    pitch:
      "Book a football, volleyball or tennis pitch in a minute: pick a time, tap a free pitch on the map, and get confirmed on Telegram. No account needed.",

    facts: [
      { label: "Role", value: "Solo, full-stack" },
      { label: "Platform", value: "Web · Telegram Mini App" },
      { label: "Languages", value: "English · ខ្មែរ" },
      { label: "Venues", value: "3 branches · 24 pitches" },
    ],

    problem:
      "Pitches in Phnom Penh are booked by phone calls and Facebook messages. Players can't see what's free, staff juggle chats and a paper sheet, and double bookings happen.",

    solution:
      "A booking app that shows every free pitch on a map of the venue, takes a request in a minute without sign-up, and sends it straight to staff on Telegram, with a day timeline to run each branch.",

    // Left empty on purpose (no "How I built it" section).
    steps: [],

    // User flow, in order. Phone only (desktop left out on purpose).
    screens: [
      {
        group: "Customer",
        title: "Home",
        text: "Three steps up front: pick a time and pitch, add your name, get confirmed on Telegram.",
        phone: "home",
      },
      {
        group: "Customer",
        title: "Pick a branch",
        text: "Each branch shows if it's open now, its hours and the lowest price.",
        phone: "branches",
      },
      {
        group: "Customer",
        title: "Branch page",
        text: "Directions in one tap, then the booking starts with the day.",
        phone: "branch",
      },
      {
        group: "Customer",
        title: "Day and time",
        text: "Two weeks of days and 1h to 3h slots, each showing how many pitches are free.",
        phone: "time",
      },
      {
        group: "Customer",
        title: "Pitch on the map",
        text: "Tap a free pitch on a plan of the venue. Taken ones are dark; the price shows in dollars and riel.",
        phone: "map",
      },
      {
        group: "Customer",
        title: "Your details",
        text: "Just a name, a phone number and how many players. No account, no password.",
        phone: "form",
      },
      {
        group: "Customer",
        title: "Request sent",
        text: "The pitch is held, with a booking code and the price. You pay at the venue.",
        phone: "sent",
      },
      {
        group: "Staff",
        title: "Waiting for you",
        text: "New requests first. Confirm, decline, call or chat with the customer in one tap.",
        phone: "staff",
      },
      {
        group: "Staff",
        title: "Day timeline",
        text: "Every pitch of a branch on one timeline. Brown is waiting, green is confirmed.",
        phone: "schedule",
      },
      {
        group: "Staff",
        title: "Booking details",
        text: "Who booked, when, the price and whether it came from the app or staff.",
        phone: "sheet",
      },
      {
        group: "Staff",
        title: "Walk-ins",
        text: "Staff add phone and walk-in bookings, confirmed at once.",
        phone: "add",
      },
      {
        group: "Customer",
        title: "In Khmer",
        text: "Every screen switches to Khmer with one tap.",
        phone: "home-km",
      },
      {
        group: "Customer",
        title: "Dark mode",
        text: "Light and dark, for evening games.",
        phone: "map-dark",
      },
    ],

    stats: [
      { value: 24, label: "pitches on the map" },
      { value: 3, label: "branches" },
      { value: 104, label: "automated tests" },
      { value: 241, label: "strings in Khmer" },
    ],

    // Left empty on purpose (no "How I built it" section).
    practices: [],
    challenges: [],
    lessons: [],

    // Future development plan.
    next: [
      "Pay online with Bakong KHQR when booking",
      "Reminders on Telegram before the game",
      "Repeat bookings for teams that play every week",
      "Reports for the owner: busy hours and income per branch",
    ],
  },
} as const;
