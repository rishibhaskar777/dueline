import { describe, expect, it } from "vitest";
import { SITEMAP_PATHS, SITE_LINKS, activeSiteLink } from "@/components/site/site-nav";
import sitemap from "@/app/sitemap";

describe("activeSiteLink", () => {
  it.each([
    ["/how-it-works", 0],
    ["/features", 1],
    ["/for-your-ca", 2],
    ["/built-on-paypal", 3],
  ])("marks %s as link %i", (path, index) => {
    expect(activeSiteLink(path)).toBe(index);
    expect(SITE_LINKS[index].href).toBe(path);
  });

  it("marks nothing on the landing page or a page outside the site", () => {
    expect(activeSiteLink("/")).toBeNull();
    expect(activeSiteLink("/receivables")).toBeNull();
    expect(activeSiteLink("/features-extra")).toBeNull();
  });
});

describe("sitemap", () => {
  it("lists the landing page and the four site pages", () => {
    expect(SITEMAP_PATHS).toEqual([
      "/",
      "/how-it-works",
      "/features",
      "/for-your-ca",
      "/built-on-paypal",
    ]);
  });

  it("uses full addresses on the site", () => {
    const urls = sitemap().map(({ url }) => url);
    expect(urls[0]).toBe("https://dueline-azure.vercel.app");
    expect(urls).toContain("https://dueline-azure.vercel.app/features");
    expect(urls).toHaveLength(5);
  });
});
