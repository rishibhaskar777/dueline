import Link from "next/link";
import { Wordmark } from "@/components/layout/Wordmark";
import { REPOSITORY_URL } from "@/lib/repository";
import { DEMO_HREF, SITE_LINKS } from "./site-nav";

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

interface FooterColumn {
  id: string;
  title: string;
  links: readonly FooterLink[];
}

const COLUMNS: readonly FooterColumn[] = [
  { id: "footer-product", title: "Product", links: SITE_LINKS },
  {
    id: "footer-try",
    title: "Try it",
    links: [
      { href: DEMO_HREF, label: "Open the demo" },
      { href: `${REPOSITORY_URL}#run-it-yourself`, label: "Run it locally", external: true },
    ],
  },
  {
    id: "footer-project",
    title: "Project",
    links: [
      { href: REPOSITORY_URL, label: "Source on GitHub", external: true },
      {
        href: `${REPOSITORY_URL}/blob/main/docs/architecture.md`,
        label: "Documentation",
        external: true,
      },
      { href: `${REPOSITORY_URL}/blob/main/LICENSE`, label: "MIT licence", external: true },
    ],
  },
];

const LINK_CLASS =
  "inline-flex items-center rounded-sm text-[15px] text-foreground hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11";

function FooterAnchor({ href, label, external }: FooterLink) {
  if (!external) {
    return (
      <Link href={href} className={LINK_CLASS}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer text-foreground">
      <div className="mx-auto max-w-[1200px] px-4 pt-12 pb-6 md:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex flex-col items-start gap-3.5">
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Wordmark />
            </Link>
            <p className="text-[15px] text-balance text-muted-foreground">
              Get paid from abroad. Without chasing.
            </p>
          </div>
          <nav aria-label="Footer" className="contents">
            {COLUMNS.map(({ id, title, links }) => (
              <div key={id} className="flex flex-col gap-2">
                <p
                  id={id}
                  className="text-[13px] font-bold tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {title}
                </p>
                <ul aria-labelledby={id} className="flex flex-col md:gap-1.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <FooterAnchor {...link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-bar-line pt-5 text-[13px] text-muted-foreground">
          <p>© 2026 Dueline</p>
          <p>PayPal is a trademark of PayPal, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
