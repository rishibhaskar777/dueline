import Link from "next/link";
import { Suspense } from "react";
import { FileUp, Inbox, Landmark, MailWarning, Plus, UserRound, Users } from "lucide-react";
import { PaletteButton } from "@/components/palette/PaletteButton";
import { DemoToolsLink } from "./DemoToolsLink";
import { LockDemoButton } from "./LockDemoButton";
import { NavLink } from "./NavLink";
import { NudgesLink } from "./NudgesLink";
import { RateAlertBadge } from "./RateAlertBadge";
import { SidebarShell } from "./SidebarShell";
import { StatusLine } from "./StatusLine";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

const iconProps = { "aria-hidden": true, className: "size-5 shrink-0" } as const;

export function Sidebar() {
  return (
    <SidebarShell
      brand={
        <Link
          href="/"
          className="flex min-h-11 w-fit items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Wordmark />
        </Link>
      }
    >
      <PaletteButton />
      <nav aria-label="Main" className="md:flex-1">
        <Suspense>
          <ul className="flex flex-col gap-1">
            <li>
              <NavLink href="/receivables" icon={<Inbox {...iconProps} />}>
                Receivables
              </NavLink>
            </li>
            <li>
              <NavLink href="/clients" icon={<Users {...iconProps} />}>
                Clients
              </NavLink>
            </li>
            <li>
              <NavLink href="/invoices/new" icon={<Plus {...iconProps} />}>
                New invoice
              </NavLink>
            </li>
            <li>
              <NudgesLink icon={<MailWarning {...iconProps} />} />
            </li>
            <li>
              <NavLink href="/export" icon={<FileUp {...iconProps} />}>
                Export register
              </NavLink>
            </li>
            <li>
              <NavLink href="/profile" icon={<UserRound {...iconProps} />}>
                Profile
              </NavLink>
            </li>
            <li>
              <NavLink href="/settings" icon={<Landmark {...iconProps} />}>
                Fees and rates
                <RateAlertBadge />
              </NavLink>
            </li>
            <DemoToolsLink />
          </ul>
        </Suspense>
      </nav>
      <StatusLine />
      <ThemeToggle className="max-md:hidden" />
      <LockDemoButton />
    </SidebarShell>
  );
}
