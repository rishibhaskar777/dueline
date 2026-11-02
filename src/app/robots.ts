import type { MetadataRoute } from "next";
import { SITE_URL } from "./site-url";

// The landing page and the four pages linked from it are for search engines. The app screens sit
// behind the demo password anyway.
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
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
