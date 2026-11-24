#!/usr/bin/env node
/** End-to-end smoke test on a phone viewport: sign in, pick a pitch on the map, book, see the receipt, cancel. */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots", "e2e");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true })).newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && !/openstreetmap|Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 300)));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
const shot = (name) => page.screenshot({ path: join(out, `${name}.png`) });
const step = async (name, fn) => { await fn(); await page.waitForTimeout(700); await shot(name); console.log("✓", name); };

await step("1-login", async () => { await page.goto(`${base}/en/login?next=/book/russey-keo-futsal`, { waitUntil: "networkidle" }); });
await step("2-pick-pitch", async () => {
  // Sign in with the form (demo buttons are hidden in real mode).
  await page.fill("#email", "dara@pitchkh.app");
  await page.fill("#password", "password");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/book\//);
  await page.getByRole("radiogroup", { name: "Day" }).getByRole("radio").nth(5).click();
  // Tap the pitch on the map (each pitch is a radio named "Court 1, 5v5, Free").
  await page.getByRole("radio", { name: /^Court 1, / }).click();
});
await step("3-time", async () => {
  await page.locator('ol[aria-label="Available times"] button:not([disabled])').first().waitFor();
  const free = page.locator('ol[aria-label="Available times"] button:not([disabled])');
  await free.nth(2).click();
  await free.nth(4).click();
});
await step("4-confirm", async () => {
  await page.getByRole("button", { name: "Continue" }).last().click();
  // Matches are switched off on the v1 API, so this option may be hidden.
  const find = page.getByRole("radio", { name: /Find me an opponent/ });
  if (await find.count()) await find.click();
  await page.getByRole("button", { name: /Players and extras/ }).click();
  await page.getByRole("button", { name: "Water bottles +" }).click();
});
await step("5-khqr", async () => { await page.getByRole("button", { name: /^Pay \$/ }).last().click(); await page.getByRole("button", { name: "I've paid" }).waitFor(); });
await step("6-receipt", async () => { await page.getByRole("button", { name: "I've paid" }).click(); await page.waitForURL(/\/booking\//, { timeout: 15000 }); await page.getByRole("heading", { name: "You're booked" }).waitFor(); });
await step("7-cancel", async () => { await page.getByRole("button", { name: "Cancel booking" }).click(); await page.getByRole("button", { name: "Cancel booking" }).last().click(); await page.getByText("Cancelled").first().waitFor(); });
await browser.close();
console.log(errors.length ? "Console errors:\n" + [...new Set(errors)].join("\n") : "No console errors");
process.exit(errors.length ? 1 : 0);
