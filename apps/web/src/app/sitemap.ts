import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { siteUrl } from "@/lib/site";

// Rebuilt at most once an hour, so new venues show up without a redeploy.
export const revalidate = 3600;

const PAGES = ["", "/venues", "/matches", "/help", "/terms", "/privacy"];

/** Every public page and every live venue, in English and Khmer (with each other as alternates). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (path: string, changeFrequency: "daily" | "weekly" | "monthly", priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}/en${path}`,
    changeFrequency,
    priority,
    alternates: { languages: { en: `${siteUrl}/en${path}`, km: `${siteUrl}/km${path}` } },
  });
  const slugs: string[] = [];
  try {
    for (let page = 1; page <= 20; page++) {
      const result = await api.venues.list({ page, pageSize: 100 });
      slugs.push(...result.data.map((v) => v.slug));
      if (page >= result.meta.totalPages) break;
    }
  } catch {
    // API unreachable: still publish the static pages rather than failing the build.
  }
  return [
    ...PAGES.map((p) => entry(p, p === "" || p === "/venues" ? "daily" : "monthly", p === "" ? 1 : 0.6)),
    ...slugs.map((slug) => entry(`/venues/${slug}`, "daily", 0.8)),
  ];
}
