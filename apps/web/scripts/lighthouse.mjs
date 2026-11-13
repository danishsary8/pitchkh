#!/usr/bin/env node
/**
 * Lighthouse mobile scores for key pages (needs `pnpm build && pnpm start`).
 *   node apps/web/scripts/lighthouse.mjs [--base http://localhost:3000] [--pages /en,/en/venues] [--runs 3] [--detail]
 * Reports the median of N runs, because single lab runs vary by several points.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (name, fallback) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);
const base = arg("base", "http://localhost:3000");
const pages = arg("pages", "/en,/en/venues,/en/venues/bkk-sports-club,/en/matches").split(",");
const runs = Number(arg("runs", "3"));
const detail = process.argv.includes("--detail");
// "simulate" (Lighthouse default, a model) or "devtools" (really throttles network and CPU while loading).
const throttling = arg("throttling", "simulate");
const chrome = process.env.CHROME_PATH ?? (() => {
  const root = "/opt/pw-browsers";
  const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
  return join(root, dir, "chrome-linux64", "chrome");
})();
const out = mkdtempSync(join(tmpdir(), "lh-"));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

for (const page of pages) {
  const reports = [];
  for (let i = 0; i < runs; i++) {
    const file = join(out, `r${i}.json`);
    execFileSync("npx", ["-y", "lighthouse@12", base + page, "--quiet", "--form-factor=mobile", `--throttling-method=${throttling}`, "--chrome-flags=--headless --no-sandbox", "--only-categories=performance,accessibility,best-practices,seo", "--output=json", `--output-path=${file}`], { env: { ...process.env, CHROME_PATH: chrome }, stdio: "ignore" });
    reports.push(JSON.parse(readFileSync(file, "utf8")));
  }
  const score = (c) => median(reports.map((r) => Math.round(r.categories[c].score * 100)));
  const num = (a) => median(reports.map((r) => r.audits[a].numericValue));
  console.log(`${page}  perf=${score("performance")} a11y=${score("accessibility")} bp=${score("best-practices")} seo=${score("seo")}  FCP=${(num("first-contentful-paint") / 1000).toFixed(1)}s LCP=${(num("largest-contentful-paint") / 1000).toFixed(1)}s TBT=${Math.round(num("total-blocking-time"))}ms CLS=${num("cumulative-layout-shift").toFixed(3)} SI=${(num("speed-index") / 1000).toFixed(1)}s`);
  if (detail) {
    const r = reports[0];
    const reqs = r.audits["network-requests"].details.items;
    const kb = (type) => Math.round(reqs.filter((i) => i.resourceType === type).reduce((s, i) => s + i.transferSize, 0) / 1024);
    console.log(`   transfer: js=${kb("Script")}KB css=${kb("Stylesheet")}KB font=${kb("Font")}KB img=${kb("Image")}KB  requests=${reqs.length}`);
    console.log("   scripts:", reqs.filter((i) => i.resourceType === "Script").sort((a, b) => b.transferSize - a.transferSize).slice(0, 12).map((i) => `${i.url.split("/").pop().slice(0, 16)}=${Math.round(i.transferSize / 1024)}`).join(" "));
    const lcp = r.audits["largest-contentful-paint-element"]?.details?.items ?? [];
    console.log("   LCP:", (lcp[0]?.items?.[0]?.node?.snippet ?? "").slice(0, 90), "|", (lcp[1]?.items ?? []).map((p) => `${p.phase}=${Math.round(p.timing)}`).join(" "));
    console.log("   bootup:", r.audits["bootup-time"].details.items.slice(0, 5).map((i) => `${i.url.split("/").pop().slice(0, 16)}=${Math.round(i.total)}ms`).join(" "));
  }
}
