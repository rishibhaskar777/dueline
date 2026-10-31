import Link from "next/link";
import { FileUp, Inbox, Landmark, MailWarning, Plus } from "lucide-react";
import { DemoToolsLink } from "./DemoToolsLink";
import { LockDemoButton } from "./LockDemoButton";
import { NavLink } from "./NavLink";
import { StatusLine } from "./StatusLine";
import { Wordmark } from "./Wordmark";

const iconProps = { "aria-hidden": true, className: "size-5 shrink-0" } as const;

export function Sidebar() {
  return (
    <aside className="flex flex-col gap-6 bg-sidebar p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:p-5">
      <Link
        href="/"
        className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <Wordmark />
      </Link>
      <nav aria-label="Main" className="md:flex-1">
        <ul className="flex flex-wrap gap-1 md:flex-col">
          <li>
            <NavLink href="/receivables" icon={<Inbox {...iconProps} />}>
              Receivables
            </NavLink>
          </li>
          <li>
            <NavLink href="/invoices/new" icon={<Plus {...iconProps} />}>
              New invoice
            </NavLink>
          </li>
          <li>
            <NavLink href="/nudges" icon={<MailWarning {...iconProps} />}>
              Nudges
            </NavLink>
          </li>
          <li>
            <NavLink href="/export" icon={<FileUp {...iconProps} />}>
              Export register
            </NavLink>
          </li>
          <li>
            <NavLink href="/settings" icon={<Landmark {...iconProps} />}>
              Fees and rates
            </NavLink>
          </li>
          <DemoToolsLink />
        </ul>
      </nav>
      <StatusLine />
      <LockDemoButton />
    </aside>
  );
}
