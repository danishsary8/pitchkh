#!/usr/bin/env node
/**
 * Screenshots key pages at the five target widths and reports layout problems
 * (horizontal overflow, console errors). Needs a running server:
 *   pnpm build && pnpm start &      then      node apps/web/scripts/screenshots.mjs
 * Options: --base http://localhost:3000  --pages /en,/en/venues  --widths 360,1440  --login player|owner|admin  --full
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const arg = (name, fallback) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);
const base = arg("base", "http://localhost:3000");
const widths = arg("widths", "360,390,768,1024,1440").split(",").map(Number);
const pages = arg("pages", "/en,/en/venues,/en/venues/bkk-sports-club,/en/matches,/km").split(",");
const login = arg("login", null);
const full = process.argv.includes("--full");
const out = arg("out", join(dirname(fileURLToPath(import.meta.url)), "..", "screenshots"));
mkdirSync(out, { recursive: true });
const EMAILS = { player: "dara@pitchkh.app", owner: "sophea@pitchkh.app", admin: "admin@pitchkh.app" };

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let problems = 0;
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 780 : 900 }, deviceScaleFactor: 1, hasTouch: width < 1024, isMobile: width < 768, colorScheme: arg("scheme", "light"), reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && !/tile\.openstreetmap|Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  if (login) {
    await page.goto(`${base}/en/login`, { waitUntil: "networkidle" });
    await page.fill("#email", EMAILS[login]);
    await page.fill("#password", "password");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 });
  }
  for (const path of pages) {
    errors.length = 0;
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    // Scroll through the page so scroll-reveal sections and lazy images render.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      if (doc.scrollWidth <= doc.clientWidth + 1) return null;
      const wide = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1 && !el.closest(".no-scrollbar, .leaflet-container, svg")).slice(0, 3).map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`);
      return `${doc.scrollWidth} > ${doc.clientWidth}: ${wide.join(" | ")}`;
    });
    const name = `${path.replace(/^\//, "").replace(/[/?=&]/g, "_") || "root"}${login ? `_${login}` : ""}_${width}.png`;
    await page.screenshot({ path: join(out, name), fullPage: full });
    if (overflow || errors.length) {
      problems++;
      console.log(`✗ ${path} @${width}${overflow ? `  overflow ${overflow}` : ""}${errors.length ? `  errors: ${[...new Set(errors)].join(" ;; ")}` : ""}`);
    } else console.log(`✓ ${path} @${width}`);
  }
  await context.close();
}
await browser.close();
console.log(problems ? `${problems} page(s) with problems` : "No overflow or console errors");
process.exit(problems ? 1 : 0);
