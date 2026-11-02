export interface NavTab {
  href: string;
  label: string;
}

export const NAV_TABS: readonly NavTab[] = [
  { href: "/receivables", label: "Home" },
  { href: "/invoices/new", label: "New invoice" },
  { href: "/clients", label: "Clients" },
  { href: "/nudges", label: "Nudges" },
  { href: "/export", label: "Export register" },
];

function isWithin(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// The tab a page belongs to. An invoice's own page belongs to Home, and pages with no tab
// (Profile, Fees and rates, Demo tools) give null.
export function activeTabIndex(pathname: string): number | null {
  const href = isWithin(pathname, "/invoices/new")
    ? "/invoices/new"
    : isWithin(pathname, "/invoices")
      ? "/receivables"
      : NAV_TABS.map((tab) => tab.href).find((base) => isWithin(pathname, base));
  const index = NAV_TABS.findIndex((tab) => tab.href === href);
  return index >= 0 ? index : null;
}
