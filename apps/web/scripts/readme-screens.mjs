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
const phone = async () => (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const desktop = async () => (await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 })).newPage();
const scrollTo = (page, text) => page.getByText(text, { exact: true }).first().evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));

// 1. Pick screen: time first, then a pitch on the map.
let page = await phone();
await page.goto(`${base}/en/book/chbar-ampov-football-city`, { waitUntil: "networkidle" });
await settle(page);
await page.getByRole("radiogroup", { name: "Day" }).getByRole("radio").nth(1).click();
await page.getByRole("radio", { name: /^19:00/ }).click();
await page.getByRole("radio", { name: /^Big Pitch, / }).click();
await settle(page);
await scrollTo(page, "Start time");
await save(page, "booking-pick");

// 2. Confirm screen.
const slots = page.locator('ol[aria-label="Available times"] button[aria-pressed="true"]');
await slots.first().waitFor();
await page.getByRole("button", { name: "Continue" }).last().click();
await settle(page);
await save(page, "booking-confirm");
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
await page.goto(`${base}/en/login`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /owner/i }).first().click();
await settle(page);
await page.goto(`${base}/en/owner/venues`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: /^Pitch map/ }).nth(1).click();
await page.getByRole("application").waitFor();
await settle(page);
await save(page, "owner-editor");

await browser.close();
