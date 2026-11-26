import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;
// With STORAGE=r2 on the API, photos come from the bucket's public URL (same value as the API's R2_PUBLIC_URL).
const photosOrigin = process.env.NEXT_PUBLIC_PHOTOS_URL ? new URL(process.env.NEXT_PUBLIC_PHOTOS_URL) : null;
const pattern = (origin: URL, pathname: string) => ({ protocol: origin.protocol.replace(":", "") as "http" | "https", hostname: origin.hostname, port: origin.port, pathname });

const nextConfig: NextConfig = {
  // packages/shared ships TypeScript source; Next compiles it with the app.
  transpilePackages: ["@pitchkh/shared"],
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Uploaded venue photos: the API's /uploads (local storage) or the R2 bucket's /venues.
    remotePatterns: [...(apiOrigin ? [pattern(apiOrigin, "/uploads/**")] : []), ...(photosOrigin ? [pattern(photosOrigin, "/venues/**")] : [])],
    deviceSizes: [360, 430, 640, 768, 1024, 1280, 1536],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
      // Standard browser protections on every page. The app uses share and clipboard only, so
      // camera, microphone, location and payment APIs are switched off. Only Telegram's web clients may frame it (Mini App).
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // Telegram Web (web.telegram.org) opens Mini Apps in a frame, so Telegram's own web
          // clients may frame the app; every other site still can't. (X-Frame-Options has no
          // allow-list, so frame-ancestors does this job alone.)
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://web.telegram.org https://webk.telegram.org https://webz.telegram.org; base-uri 'self'; object-src 'none'; form-action 'self'" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
