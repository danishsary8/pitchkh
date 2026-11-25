#!/usr/bin/env node
/**
 * Captures the screenshots used in the README into docs/images (webp).
 * Needs a running app (pnpm dev, or pnpm build && pnpm start):
 *   node apps/web/scripts/readme-screens.mjs [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require(require.resolve("sharp", { paths: [dirname(require.resolve("next/package.json"))] }));
const base = process.argv[2] ?? "http://localhost:3000";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs", "images");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const save = async (page, name, clip) => {
  const png = await page.screenshot(clip ? { clip } : { fullPage: false });
  await sharp(png).webp({ quality: 82 }).toFile(join(out, `${name}.webp`));
  console.log("✓", name);
};
const settle = (page) => page.waitForTimeout(1600);
// Product shots: hide the public-demo notice bar so the screens show the app itself.
const clean = async (context) => {
  await context.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "[data-demo-notice]{display:none!important}";
      document.head.append(style);
    });
  });
  return context.newPage();
};
const phone = async (options = {}) => clean(await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce", ...options }));
const desktop = async () => clean(await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2, reducedMotion: "reduce" }));
const signIn = async (page, role) => {
  await page.goto(`${base}/en/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: role }).first().click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"));
  await settle(page);
};
const scrollTo = (page, text) => page.getByText(text, { exact: true }).first().evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));

// 0. Venue list with one-tap times, and the signed-in home with the next game.
let page = await phone();
await page.goto(`${base}/en/venues`, { waitUntil: "networkidle" });
await settle(page);
await save(page, "venue-list");
await signIn(page, /Player/);
await page.goto(`${base}/en`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await save(page, "home-next-game");
await page.context().close();

// 0b. Home "how it works": the live pitch map next to the three steps (desktop).
page = await desktop();
await page.goto(`${base}/en`, { waitUntil: "networkidle" });
await page.getByRole("radiogroup", { name: /Map of the pitches/ }).waitFor();
await page.locator("#how-title").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96));
await settle(page);
// Crop below the sticky header.
await save(page, "home-map", { x: 0, y: 64, width: 1280, height: 600 });
await page.context().close();

// 1. Pick screen: time first, then a pitch on the map (signed in, so we can pay at the end).
page = await phone();
await signIn(page, /Player/);
await page.goto(`${base}/en/book/chbar-ampov-football-city`, { waitUntil: "networkidle" });
await settle(page);
await page.getByRole("radiogroup", { name: "Day" }).getByRole("radio").nth(1).click();
await page.getByRole("radio", { name: /^19:00/ }).click();
await page.getByRole("radio", { name: /^Big Pitch, / }).click();
await settle(page);
await scrollTo(page, "Free pitches at");
await save(page, "booking-pick");

// 2. Confirm screen.
const slots = page.locator('ol[aria-label="Available times"] button[aria-pressed="true"]');
await slots.first().waitFor();
await page.getByRole("button", { name: "Continue" }).last().click();
await settle(page);
await save(page, "booking-confirm");

// 2b. KHQR payment sheet, then the booking ticket.
await page.getByRole("button", { name: /^Pay \$/ }).last().click();
await page.getByRole("button", { name: "I've paid" }).waitFor();
await settle(page);
await save(page, "booking-khqr");
await page.getByRole("button", { name: "I've paid" }).click();
await page.getByRole("heading", { name: "You're booked" }).waitFor();
await settle(page);
await save(page, "booking-ticket");
await page.context().close();

// 2c. Venue page in Khmer, dark mode.
page = await phone({ colorScheme: "dark" });
await page.goto(`${base}/km/venues/chbar-ampov-football-city`, { waitUntil: "networkidle" });
await settle(page);
await save(page, "venue-km-dark");
await page.context().close();

// 2d. Owner on a phone: booking requests and the day's schedule.
page = await phone();
await signIn(page, /owner/i);
for (const [path, name] of [["/en/owner/bookings", "owner-requests"], ["/en/owner/schedule", "owner-schedule"]]) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  // Tomorrow always has bookings (today may be over, depending on the hour).
  if (name === "owner-schedule") await page.getByRole("radio").nth(1).click();
  await settle(page);
  await save(page, name);
}
await page.context().close();

// 2e. Admin analytics (desktop).
page = await desktop();
await signIn(page, /Admin/);
await page.goto(`${base}/en/admin`, { waitUntil: "networkidle" });
await settle(page);
await save(page, "admin-analytics");
await page.context().close();

// 3. Venue page map (desktop).
page = await desktop();
await page.goto(`${base}/en/venues/chbar-ampov-football-city`, { waitUntil: "networkidle" });
await settle(page);
await page.getByRole("radio", { name: /^6B, / }).click();
await scrollTo(page, "Pitches");
await settle(page);
await save(page, "venue-map");
await page.context().close();

// 4. Owner pitch map editor (desktop).
page = await desktop();
await signIn(page, /owner/i);
await page.goto(`${base}/en/owner/venues`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: /^Pitch map/ }).nth(1).click();
await page.getByRole("application").waitFor();
await settle(page);
await save(page, "owner-editor");

await browser.close();
