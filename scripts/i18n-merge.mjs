#!/usr/bin/env node
/**
 * Deep-merges a { en: {...}, km: {...} } fragment into the shared message
 * files and fails if the two languages do not have exactly the same keys.
 *   node scripts/i18n-merge.mjs fragment.json     (merge + check)
 *   node scripts/i18n-merge.mjs                   (check only)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../packages/shared/src/i18n/", import.meta.url));
const load = (name) => (existsSync(dir + name) ? JSON.parse(readFileSync(dir + name, "utf8")) : {});
const merge = (into, from) => {
  for (const [key, value] of Object.entries(from)) {
    if (value && typeof value === "object") into[key] = merge(into[key] && typeof into[key] === "object" ? into[key] : {}, value);
    else into[key] = value;
  }
  return into;
};
const keys = (obj, prefix = "") => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const en = load("en.json");
const km = load("km.json");
if (process.argv[2]) {
  const fragment = JSON.parse(readFileSync(process.argv[2], "utf8"));
  merge(en, fragment.en ?? {});
  merge(km, fragment.km ?? {});
  writeFileSync(dir + "en.json", JSON.stringify(en, null, 2) + "\n");
  writeFileSync(dir + "km.json", JSON.stringify(km, null, 2) + "\n");
}
const enKeys = new Set(keys(en));
const kmKeys = new Set(keys(km));
const missingKm = [...enKeys].filter((k) => !kmKeys.has(k));
const missingEn = [...kmKeys].filter((k) => !enKeys.has(k));
if (missingKm.length || missingEn.length) {
  console.error("Missing in km.json:", missingKm, "\nMissing in en.json:", missingEn);
  process.exit(1);
}
console.log(`i18n ok: ${enKeys.size} keys in en and km`);
