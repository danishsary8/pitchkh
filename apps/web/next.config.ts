import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const apiOrigin = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;

const nextConfig: NextConfig = {
  // packages/shared ships TypeScript source; Next compiles it with the app.
  transpilePackages: ["@pitchkh/shared"],
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Venue photos uploaded to the real API are served from its /uploads.
    remotePatterns: apiOrigin ? [{ protocol: apiOrigin.protocol.replace(":", "") as "http" | "https", hostname: apiOrigin.hostname, port: apiOrigin.port, pathname: "/uploads/**" }] : [],
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
