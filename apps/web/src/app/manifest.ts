import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PitchKH: book sports fields in Cambodia",
    short_name: "PitchKH",
    description: "Book football, volleyball and tennis fields across Cambodia and find an opponent.",
    start_url: "/en?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f5ef",
    theme_color: "#0a7446",
    lang: "en",
    categories: ["sports", "lifestyle"],
    icons: [
      { src: "/assets/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/assets/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Find a venue", url: "/en/venues" },
      { name: "My bookings", url: "/en/account/bookings" },
    ],
  };
}
