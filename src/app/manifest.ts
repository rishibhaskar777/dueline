import type { MetadataRoute } from "next";

// Lets a phone or a browser install Dueline as an app. There is no service worker, so it needs a
// connection like the site does.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dueline",
    short_name: "Dueline",
    description: "Cross-border receivables for freelancers in India, built on PayPal",
    start_url: "/receivables",
    scope: "/",
    display: "standalone",
    background_color: "#0D1B2E",
    theme_color: "#0D1B2E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
