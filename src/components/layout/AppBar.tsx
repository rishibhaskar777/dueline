import Link from "next/link";
import { Suspense } from "react";
import { PaletteButton } from "@/components/palette/PaletteButton";
import { AccountMenu } from "./AccountMenu";
import { MainTabs } from "./MainTabs";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

// One row from 768 px up, where the word beside the mark gives way first on a narrow tablet. Below
// 768 px the tabs drop to a second row of their own.
export function AppBar() {
  return (
    <header className="app-bar sticky top-0 z-40 text-foreground">
      <div className="mx-auto flex max-w-[1328px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 md:flex-nowrap md:gap-x-3 md:px-4 lg:gap-x-5 lg:px-6">
        <Link
          href="/"
          className="flex min-h-11 flex-none items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Wordmark textClassName="md:max-[839px]:hidden" />
        </Link>
        <div className="max-md:order-3 max-md:w-full md:flex-none">
          <Suspense>
            <MainTabs />
          </Suspense>
        </div>
        <div className="ml-auto flex flex-none items-center gap-2 max-md:order-2">
          <PaletteButton />
          <ThemeToggle />
          <Suspense>
            <AccountMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
