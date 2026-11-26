import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Search engines may index public pages; the staff screens stay out. */
export default function robots(): MetadataRoute.Robots {
  const privateAreas = ["admin"];
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...privateAreas.flatMap((area) => [`/en/${area}`, `/km/${area}`])] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
