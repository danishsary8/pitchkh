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
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
};

export default withNextIntl(nextConfig);
