/**
 * PitchKH — portfolio entry, ready to paste.
 *
 * Shaped like the Bookly entry in Danish_portfolio/src/content/portfolio.ts
 * (same `Project` + `CaseStudy` fields), so it drops in next to it.
 * The "How I built it" parts (steps, practices, challenges, lessons) are left
 * empty on purpose: this case study shows the problem, what was built, the
 * screens, the numbers and what comes next.
 *
 * Phone screens only (this is a Telegram Mini App and is used on phones):
 * every screen has `phone` set and `desktop: ""`. See README step 4 for the
 * one-line change that shows a phone-only screen.
 *
 * Every number below was checked against the code on 27 Nov 2026:
 *   3 branches × 8 pitches = 24 pitches (apps/web/src/lib/branches.ts),
 *   104 automated tests passing (71 web + 33 shared),
 *   7 REST endpoints under apps/web/src/app/api,
 *   241 interface strings in both en.json and km.json,
 *   4 game lengths (1h, 1h30, 2h, 3h), bookable up to 14 days ahead.
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
//     pitchkhShots: { phoneMap: pitchkh("m-pitch"), phoneAlert: pitchkh("m-telegram-alert") },
//
// 2) Copy portfolio/screens/*.webp into src/assets/projects/pitchkh/
//    and portfolio/cover/*.webp wherever the covers live.
//
// 3) Add "pitchkh" to Project["id"] and a THEMES entry in ProjectCover.tsx
//    (see README), or use cover/card.webp as the card image.

export const pitchkhProject = {
  id: "pitchkh",
  title: "PitchKH",
  coverLine: "Book a pitch, confirmed on Telegram",
  kind: "Pitch booking · Telegram Mini App",
  summary:
    "A booking app for a sports business with three branches in Phnom Penh. Customers pick a time and a pitch on a map of the venue and send their name and phone, with no account. The owner gets each request on Telegram, confirms it in one tap and sees every pitch on a timeline. Built solo, working with an AI coding assistant.",
  highlights: [
    "Book in about a minute: day, time block, pitch on a site map, name and phone",
    "Runs inside Telegram as a Mini App; staff are recognised by Telegram, no passwords",
    "The database itself refuses double bookings",
  ],
  stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "PostgreSQL", "Telegram Bot API"],
  hosting: "Vercel · Neon",
  liveUrl: "https://pitchkh.vercel.app/",
  githubUrl: "https://github.com/danishsary8/pitchkh",
  imageAlt: "PitchKH pitch map on a phone next to the owner's Telegram booking alert",

  caseStudy: {
    pitch:
      "Pick a time, tap a pitch on the map, send your name. The pitch is held for you, and the owner confirms it on Telegram.",

    facts: [
      { label: "Role", value: "Solo · AI-assisted" },
      { label: "Status", value: "Live on Telegram" },
      { label: "Languages", value: "English · ខ្មែរ" },
      { label: "Sign-up", value: "None needed" },
    ],

    problem:
      "Booking a pitch here means messaging the owner and waiting. Nobody can see which pitches are free, two teams can be promised the same slot, and the owner keeps the day in a chat history.",

    solution:
      "A booking app inside Telegram: customers see what's free and book in a minute, the owner gets every request as a message, and the day's pitches sit on one timeline.",

    // Left empty on purpose (no "How I built it" section).
    steps: [],

    // Phone screens only: 430×932, shot at 1.2× and saved 516×1118.
    // The order follows the real flow: customer first, then the owner.
    screens: [
      {
        group: "Customer",
        title: "Choose a branch",
        text: "Three branches, each showing whether it's open now and the lowest price.",
        desktop: "",
        phone: "m-home",
      },
      {
        group: "Customer",
        title: "Branch page",
        text: "Photo, address, hours, directions and a Telegram chat button, then the booking steps.",
        desktop: "",
        phone: "m-branch",
      },
      {
        group: "Customer",
        title: "Day and time",
        text: "Pick 1h, 1h30, 2h or 3h; the times become back-to-back blocks with how many pitches are free.",
        desktop: "",
        phone: "m-time",
      },
      {
        group: "Customer",
        title: "Pitch on the map",
        text: "Tap a pitch on a top-down plan of the venue. Taken ones are dark, the price updates.",
        desktop: "",
        phone: "m-pitch",
      },
      {
        group: "Customer",
        title: "Name and phone",
        text: "No account. Inside Telegram the name fills itself in.",
        desktop: "",
        phone: "m-form",
      },
      {
        group: "Customer",
        title: "Request sent",
        text: "The pitch is held. A ticket with a booking code, and one tap to message the owner.",
        desktop: "",
        phone: "m-ticket",
      },
      {
        group: "Customer",
        title: "In Khmer",
        text: "Every screen switches to Khmer with one tap.",
        desktop: "",
        phone: "m-home-km",
      },
      {
        group: "Staff",
        title: "Alert on Telegram",
        text: "Each request arrives as a bot message with Chat with customer and Open bookings buttons.",
        desktop: "",
        phone: "m-telegram-alert",
      },
      {
        group: "Staff",
        title: "Waiting for you",
        text: "Every open request in one list: Confirm, Decline, Call or Chat.",
        desktop: "",
        phone: "m-staff-requests",
      },
      {
        group: "Staff",
        title: "Booking details",
        text: "Players, price and note. If they booked in the bot, confirming tells them on Telegram.",
        desktop: "",
        phone: "m-staff-booking",
      },
      {
        group: "Staff",
        title: "The day at a glance",
        text: "Every pitch on a timeline: waiting in brown, confirmed in green.",
        desktop: "",
        phone: "m-staff-schedule",
      },
      {
        group: "Staff",
        title: "Walk-ins",
        text: "Tap a free slot to add a phone or walk-in booking; it blocks the slot at once.",
        desktop: "",
        phone: "m-staff-walkin",
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
      "Real branch details, photos and prices",
      "Deposit with KHQR to hold a slot",
      "Match-day reminders from the Telegram bot",
      "\"My bookings\" for customers, and weekly reports for the owner",
    ],
  },
} as const;
