/** The public address of the web app (link previews, sitemap). Set NEXT_PUBLIC_SITE_URL in production. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pitchkh.vercel.app").replace(/\/+$/, "");
