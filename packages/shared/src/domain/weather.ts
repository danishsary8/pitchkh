import type { Province, WeatherHint } from "../types";

/** Tiny deterministic hash so the same date/province always gives the same hint. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Climate-based weather hint (mock). Cambodia: dry season Nov-Apr, hottest in
 * Mar-May, rainy season May-Oct with afternoon downpours. A real backend should
 * proxy a forecast provider and return this same shape.
 */
export function weatherHintFor(province: Province, date: string): WeatherHint {
  const month = Number(date.slice(5, 7));
  const r = hash(`${province}:${date}`);
  const wet = month >= 5 && month <= 10;
  const coastal = province === "sihanoukville" || province === "kampot";
  const rainChance = Math.min(0.95, Math.round(((wet ? 0.45 + r * 0.45 : 0.03 + r * 0.14) + (coastal && wet ? 0.08 : 0)) * 100) / 100);
  const hot = month >= 3 && month <= 5;
  const tempMaxC = Math.round((hot ? 35 : wet ? 32 : 31) + r * 3 - (coastal ? 1 : 0));
  const tempMinC = tempMaxC - 8 - Math.round(r * 2);
  const condition: WeatherHint["condition"] =
    rainChance >= 0.8 ? "storm" : rainChance >= 0.55 ? "showers" : rainChance >= 0.3 ? "cloudy" : r > 0.5 ? "partly_cloudy" : "sunny";
  const advice: WeatherHint["advice"] = condition === "storm" ? "storm" : condition === "showers" ? "rain_likely" : tempMaxC >= 35 ? "hot" : "great";
  return { date, province, condition, tempMinC, tempMaxC, rainChance, advice };
}
