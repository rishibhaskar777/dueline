"use client";

import { Menu } from "@base-ui/react/menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useDemoMode } from "@/components/demo/use-demo-mode";
import { useProfile } from "@/components/profile/use-profile";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { accountLabel, initialsOf } from "./account";
import { ITEM_CLASS } from "./account-menu-styles";
import { LockDemoItem } from "./LockDemoItem";
import { RateAlertBadge } from "./RateAlertBadge";
import { StatusLine } from "./StatusLine";
import { useRateAlertCount } from "./use-rate-alert-count";

interface PageItemProps {
  href: string;
  pathname: string;
  children: ReactNode;
}

function PageItem({ href, pathname, children }: PageItemProps) {
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Menu.LinkItem
      render={<Link href={href} />}
      aria-current={current ? "page" : undefined}
      className={cn(ITEM_CLASS, current && "bg-tint-blue")}
    >
      {children}
    </Menu.LinkItem>
  );
}

// The round button with the person's initials, and the menu it opens: profile, fees and rates,
// connection status and locking the demo. The menu is portalled so its glass blurs the page
// itself rather than the bar it hangs from.
export function AccountMenu() {
  const pathname = usePathname();
  const { profile, retry } = useProfile();
  const inDemo = useDemoMode();
  const rateAlerts = useRateAlertCount();
  const seen = useRef(pathname);

  useEffect(() => {
    if (seen.current === pathname) return;
    seen.current = pathname;
    retry();
  }, [pathname, retry]);

  const name = profile?.yourName.trim() ?? "";
  const initials = initialsOf(name);

  return (
    <Menu.Root onOpenChange={(open) => open && retry()}>
      <Menu.Trigger
        aria-label={accountLabel(name, rateAlerts)}
        data-initials={initials ?? undefined}
        className="bar-button relative w-11 bg-navy text-[15px] font-bold text-white outline-none hover:bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring after:content-[attr(data-initials)]"
      >
        {!initials && <UserRound aria-hidden className="size-5" />}
        {rateAlerts > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 size-2 rounded-full bg-alert-dot"
          />
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={16}
          className="z-50"
        >
          <Menu.Popup className="dl-menu surface-strong flex w-[260px] flex-col gap-0.5 p-2.5 outline-none">
            <div className="mb-1 flex flex-col gap-0.5 border-b border-line px-3 pt-2.5 pb-3">
              <span className="text-base font-bold">{name || "Your profile"}</span>
              <span className="text-[13px] text-muted-foreground">
                {name ? profile?.businessName : "Add your business details"}
              </span>
            </div>
            <StatusLine />
            <Menu.List className="flex flex-col gap-0.5 outline-none">
              <PageItem href="/profile" pathname={pathname}>
                Profile
              </PageItem>
              <PageItem href="/settings" pathname={pathname}>
                Fees and rates
                <RateAlertBadge count={rateAlerts} />
              </PageItem>
              {inDemo && (
                <PageItem href="/demo-tools" pathname={pathname}>
                  Demo tools
                </PageItem>
              )}
              <Menu.Separator className="my-1 h-px bg-line" />
              <LockDemoItem />
            </Menu.List>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
