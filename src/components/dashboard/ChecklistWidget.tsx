"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useLoad } from "@/components/shared/use-load";
import { Button } from "@/components/ui/button";
import { dismissChecklist, getChecklist } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const FRAME = "rounded-xl border border-line bg-card p-6";

// The first steps, ticked from what is already saved. Gone for good once dismissed.
export function ChecklistWidget() {
  const { state, reload } = useLoad(getChecklist);
  const [failure, setFailure] = useState<string | null>(null);

  async function dismiss(): Promise<void> {
    setFailure(null);
    try {
      await dismissChecklist();
      reload();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not hide this.");
    }
  }

  if (state.kind === "loading") return <SkeletonBlock className="h-40" />;
  if (state.kind === "error") return null;

  const { items, dismissed } = state.data;
  if (dismissed) return null;
  const done = items.filter((item) => item.done).length;
  const allDone = done === items.length;

  return (
    <section aria-labelledby="checklist-title" className={FRAME}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checklist-title" className="text-xl font-semibold">
          {allDone ? "All set" : "Getting started"}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {done} of {items.length} done
        </p>
      </div>
      {allDone && (
        <p className="mt-2 text-sm text-muted-foreground">
          Everything on the list is done. You can hide this card.
        </p>
      )}
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-label={`${item.label}, ${item.done ? "done" : "not done yet"}`}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm outline-none hover:bg-ground focus-visible:ring-2 focus-visible:ring-ring",
                item.done && "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  item.done ? "border-paid bg-paid text-primary-foreground" : "border-line",
                )}
              >
                {item.done && <Check className="size-3.5" />}
              </span>
              <span className={cn(item.done && "line-through")}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {allDone && (
        <Button type="button" variant="outline" className="mt-3" onClick={() => void dismiss()}>
          Hide for good
        </Button>
      )}
      {failure && (
        <p role="alert" className="mt-3 text-sm text-late">
          {failure}
        </p>
      )}
    </section>
  );
}
