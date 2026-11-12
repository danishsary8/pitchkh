#!/usr/bin/env node
/**
 * Renders every image asset from the procedural three.js scenes:
 *   venue photos, field posters, home hero, sport tiles, OG image, PWA icons, GLB models.
 * Run from apps/web:  node scripts/render-assets.mjs [--only venues|fields|brand|models]
 * Requires Playwright with Chromium (preinstalled in the dev container).
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = (...p) => join(root, "public", "assets", ...p);
const require = createRequire(import.meta.url);
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const want = (group) => !only || only === group;
for (const dir of ["venues", "fields", "brand", "models"]) mkdirSync(out(dir), { recursive: true });

// 1. Bundle the browser entry and the venue seed list.
const tmp = join(root, ".next", "render-tmp");
mkdirSync(tmp, { recursive: true });
await build({ entryPoints: [join(here, "render-entry.ts")], bundle: true, format: "iife", outfile: join(tmp, "entry.js"), logLevel: "error" });
await build({ entryPoints: [join(root, "../../packages/shared/src/mock/seed-data.ts")], bundle: true, format: "esm", platform: "node", outfile: join(tmp, "seeds.mjs"), logLevel: "error" });
const { VENUE_SEEDS } = await import(pathToFileURL(join(tmp, "seeds.mjs")).href);

// 2. Start Chromium with software WebGL.
const { chromium } = require("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ path: join(tmp, "entry.js") });

const save = async (file, job) => {
  const dataUrl = await page.evaluate((j) => window.renderScene(j), job);
  writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
};
const fieldJob = (f) => ({ sport: f.sport, surface: f.surface, indoor: f.indoor, format: f.format });
const fieldKey = (f) => `${f.sport}-${f.surface}-${f.indoor ? "in" : "out"}-${f.format.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
let count = 0;

if (want("venues")) {
  const times = ["dusk", "day", "night"];
  for (const [i, venue] of VENUE_SEEDS.entries()) {
    const sports = [...new Set(venue.fields.map((f) => f.sport))];
    // Photo 1: the headline field. Photo 2: another sport (or another field). Photo 3: a low, close angle.
    const picks = [venue.fields[0], venue.fields.find((f) => f.sport === sports[1]) ?? venue.fields[1] ?? venue.fields[0], venue.fields[venue.fields.length - 1]];
    for (const [n, field] of picks.entries()) {
      const time = field.indoor ? (n === 1 ? "day" : "night") : times[(i + n) % 3];
      await save(out("venues", `${venue.slug}-${n + 1}.webp`), {
        ...fieldJob(field), time, seed: i * 31 + n * 7 + 3, width: 1280, height: 800,
        azimuth: [0.7, -0.9, 2.3][n] + (i % 5) * 0.14, elevation: [0.34, 0.5, 0.2][n], zoom: [0.86, 0.95, 0.62][n], fov: [40, 36, 46][n],
        lookAt: n === 2 ? [0, 1.2, 0] : [0, 0, 0],
      });
      count++;
    }
  }
}

if (want("fields")) {
  const seen = new Map();
  for (const venue of VENUE_SEEDS) for (const f of venue.fields) seen.set(fieldKey(f), f);
  for (const [key, f] of seen) {
    await save(out("fields", `${key}.webp`), { ...fieldJob(f), time: "day", seed: 7, width: 960, height: 720, quality: "high" });
    count++;
  }
  // Generic per-sport fallbacks for fields an owner adds later.
  await save(out("fields", "football.webp"), { sport: "football", surface: "artificial_turf", indoor: false, format: "7v7", time: "day", seed: 7, width: 960, height: 720 });
  await save(out("fields", "volleyball.webp"), { sport: "volleyball", surface: "hard_court", indoor: false, format: "6v6", time: "day", seed: 7, width: 960, height: 720 });
  await save(out("fields", "tennis.webp"), { sport: "tennis", surface: "hard_court", indoor: false, format: "Singles", time: "day", seed: 7, width: 960, height: 720 });
  count += 3;
}

if (want("brand")) {
  await save(out("brand", "hero.webp"), { sport: "football", surface: "artificial_turf", indoor: false, format: "7v7", time: "dusk", seed: 11, width: 1920, height: 1280, azimuth: 0.42, elevation: 0.36, zoom: 0.78, fov: 42, lookAt: [0, 1, 0] });
  await save(out("brand", "sport-football.webp"), { sport: "football", surface: "futsal_court", indoor: true, format: "5v5", time: "night", seed: 5, width: 1200, height: 900, azimuth: 0.5, elevation: 0.3, zoom: 0.8 });
  await save(out("brand", "sport-volleyball.webp"), { sport: "volleyball", surface: "sand", indoor: false, format: "4v4", time: "day", seed: 9, width: 1200, height: 900, azimuth: 0.9, elevation: 0.3, zoom: 0.8 });
  await save(out("brand", "sport-tennis.webp"), { sport: "tennis", surface: "hard_court", indoor: false, format: "Singles", time: "dusk", seed: 13, width: 1200, height: 900, azimuth: -0.7, elevation: 0.32, zoom: 0.8 });
  const og = await page.evaluate((j) => window.renderScene(j), { sport: "football", surface: "artificial_turf", indoor: false, format: "7v7", time: "dusk", seed: 11, width: 1200, height: 630, azimuth: 0.95, elevation: 0.3, zoom: 0.85 });
  const sharp = require(require.resolve("sharp", { paths: [dirname(require.resolve("next/package.json"))] }));
  await sharp(Buffer.from(og.split(",")[1], "base64")).png().toFile(out("brand", "og.png"));
  const icon = readFileSync(join(root, "src/app/icon.svg"));
  await sharp(icon, { density: 600 }).resize(192, 192).png().toFile(out("brand", "icon-192.png"));
  await sharp(icon, { density: 900 }).resize(512, 512).png().toFile(out("brand", "icon-512.png"));
  await sharp(icon, { density: 600 }).resize(180, 180).png().toFile(join(root, "src/app/apple-icon.png"));
  // Maskable: the mark at 62% on a full-bleed turf square so any mask shape is safe.
  const inner = await sharp(icon, { density: 900 }).resize(320, 320).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0a7446" } }).composite([{ input: inner, gravity: "center" }]).png().toFile(out("brand", "icon-maskable-512.png"));
  count += 9;
}

if (want("models")) {
  const glb = async (name, job, onlyNode) => {
    const b64 = await page.evaluate(([j, o]) => window.exportGlb(j, o), [job, onlyNode ?? null]);
    writeFileSync(out("models", name), Buffer.from(b64, "base64"));
    count++;
  };
  await glb("football-pitch.glb", { sport: "football", surface: "artificial_turf", indoor: false, format: "7v7" });
  await glb("volleyball-court.glb", { sport: "volleyball", surface: "hard_court", indoor: false, format: "6v6" });
  await glb("tennis-court.glb", { sport: "tennis", surface: "hard_court", indoor: false, format: "Singles" });
  await glb("ball.glb", { sport: "football", surface: "artificial_turf", indoor: false, format: "5v5" }, "ball");
}

await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log(`Rendered ${count} assets into public/assets`);
