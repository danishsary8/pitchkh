import type { MetadataRoute } from "next";
import { BRANCHES } from "@/lib/branches";
import { siteUrl } from "@/lib/site";

/** Home and every branch, in English and Khmer. */
export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}/en${path}`,
    changeFrequency: "daily",
    priority,
    alternates: { languages: { en: `${siteUrl}/en${path}`, km: `${siteUrl}/km${path}` } },
  });
  return [entry("", 1), ...BRANCHES.map((b) => entry(`/branch/${b.slug}`, 0.8))];
}
