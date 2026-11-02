export interface SiteLink {
  href: string;
  label: string;
}

export const SITE_LINKS: readonly SiteLink[] = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "Features" },
  { href: "/for-your-ca", label: "For your CA" },
  { href: "/built-on-paypal", label: "Built on PayPal" },
];

// The demo's front door. The password page sends the visitor on to Home once the password is right.
export const DEMO_HREF = "/receivables";

// The link a public page belongs to; the landing page and anything else belong to none.
export function activeSiteLink(pathname: string): number | null {
  const index = SITE_LINKS.findIndex(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
  return index >= 0 ? index : null;
}

// Every public page, for the sitemap.
export const SITEMAP_PATHS: readonly string[] = ["/", ...SITE_LINKS.map(({ href }) => href)];
