"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useProfile } from "@/components/profile/use-profile";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HealthResponse } from "@/types";
import { connectionStatus, dateLine, greeting, kolkataHour } from "./home-header";

function subscribeToClock(listener: () => void): () => void {
  const timer = window.setInterval(listener, 60_000);
  return () => window.clearInterval(timer);
}

// The hour is read in the browser, so the server and the first render say nothing about it.
function useKolkataHour(): number | null {
  return useSyncExternalStore(
    subscribeToClock,
    () => kolkataHour(new Date()),
    () => null,
  );
}

function Greeting() {
  const hour = useKolkataHour();
  const { profile, error } = useProfile();
  const name = profile?.yourName ?? null;
  const settled = profile !== null || error !== null;

  return (
    <h1 className="font-heading text-4xl font-extrabold tracking-[-1.4px] md:text-5xl">
      {greeting(settled ? hour : null, name)}
    </h1>
  );
}

function DateLine({ health }: { health: HealthResponse | null }) {
  if (!health) return <SkeletonBlock className="h-6 w-72 max-w-full" />;
  const { text, connected } = connectionStatus(health);
  return (
    <p className="text-base text-muted-foreground">
      {dateLine(health.today, health.demoClock)} ·{" "}
      <span className={cn("font-semibold", connected ? "text-paid" : "text-late")}>
        <span aria-hidden="true">● </span>
        {text}
      </span>
    </p>
  );
}

interface HomeHeaderProps {
  // Null until the page has its data.
  health: HealthResponse | null;
  // Null when there is nothing to customise.
  onCustomise: (() => void) | null;
}

export function HomeHeader({ health, onCustomise }: HomeHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <Greeting />
        <DateLine health={health} />
      </div>
      <div className="flex gap-2.5">
        {onCustomise && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="px-5 font-bold"
            onClick={onCustomise}
          >
            Customise
          </Button>
        )}
        <Link
          href="/invoices/new"
          className={cn(buttonVariants({ size: "lg" }), "px-[22px] font-bold")}
        >
          + New invoice
        </Link>
      </div>
    </header>
  );
}
