import type { MetadataRoute } from "next";

// Only the landing page is for search engines. The app screens sit behind the demo password anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api",
        "/demo",
        "/receivables",
        "/clients",
        "/invoices",
        "/nudges",
        "/export",
        "/profile",
        "/settings",
        "/demo-tools",
      ],
    },
  };
}
