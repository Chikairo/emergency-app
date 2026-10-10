import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Installable: 192 + 512 PNGs,
// maskable 512 with safe-zone padding, standalone display.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Emergency Care — While Help Is on the Way",
    short_name: "Emergency Care",
    description:
      "Report an emergency, follow safe interim guidance, and track honest response status while professional help is arranged.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF6F2",
    theme_color: "#2B0A0A",
    categories: ["health", "medical", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
