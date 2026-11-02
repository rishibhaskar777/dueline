import type { MetadataRoute } from "next";
import { SITEMAP_PATHS } from "@/components/site/site-nav";
import { SITE_URL } from "./site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
