#!/usr/bin/env node
/** End-to-end smoke test on a phone viewport: sign in, book, see the receipt, cancel. */
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
await step("2-field", async () => { await page.getByRole("button", { name: /Player/ }).click(); await page.waitForURL(/\/book\//); await page.getByRole("radio", { name: /Court 1/ }).click(); });
await step("3-time", async () => {
  await page.getByRole("button", { name: "Continue" }).last().click();
  await page.getByRole("radio").nth(5).click();
  await page.locator('ol[aria-label="Available times"] button:not([disabled])').first().waitFor();
  const free = page.locator('ol[aria-label="Available times"] button:not([disabled])');
  await free.nth(2).click();
  await free.nth(4).click();
});
await step("4-details", async () => { await page.getByRole("button", { name: "Continue" }).last().click(); await page.getByRole("radio", { name: /Find me an opponent/ }).click(); await page.getByRole("button", { name: "Water bottles +" }).click(); });
await step("5-pay", async () => { await page.getByRole("button", { name: "Continue" }).last().click(); });
await step("6-khqr", async () => { await page.getByRole("button", { name: /^Pay \$/ }).last().click(); await page.getByRole("button", { name: "I've paid" }).waitFor(); });
await step("7-receipt", async () => { await page.getByRole("button", { name: "I've paid" }).click(); await page.waitForURL(/\/booking\//, { timeout: 15000 }); await page.getByRole("heading", { name: "You're booked" }).waitFor(); });
await step("8-cancel", async () => { await page.getByRole("button", { name: "Cancel booking" }).click(); await page.getByRole("button", { name: "Cancel booking" }).last().click(); await page.getByText("Cancelled").first().waitFor(); });
await browser.close();
console.log(errors.length ? "Console errors:\n" + [...new Set(errors)].join("\n") : "No console errors");
process.exit(errors.length ? 1 : 0);
