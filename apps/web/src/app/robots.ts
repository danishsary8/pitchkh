import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Search engines may index public pages; signed-in areas and flows stay out. */
export default function robots(): MetadataRoute.Robots {
  const privateAreas = ["account", "owner", "admin", "book", "booking", "reset-password"];
  return {
    rules: { userAgent: "*", allow: "/", disallow: privateAreas.flatMap((area) => [`/en/${area}`, `/km/${area}`]) },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
