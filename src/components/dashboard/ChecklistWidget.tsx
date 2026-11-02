"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useLoad } from "@/components/shared/use-load";
import { Button, buttonVariants } from "@/components/ui/button";
import { dismissChecklist, getChecklist } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { nextStep, nextStepText } from "./checklist-steps";

const FRAME =
  "surface flex flex-wrap items-center gap-x-[22px] gap-y-3 px-6 py-5 [--h2-size:18px] [--h2-tracking:0] [--h2-weight:700]";

// The first steps, ticked from what is already saved. Gone for good once dismissed.
export function ChecklistWidget() {
  const { state, reload } = useLoad(getChecklist);
  const [failure, setFailure] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function dismiss(): Promise<void> {
    setFailure(null);
    try {
      await dismissChecklist();
      reload();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not hide this.");
    }
  }

  if (state.kind === "loading") return <SkeletonBlock className="h-[4.5rem]" />;
  if (state.kind === "error") return null;

  const { items, dismissed } = state.data;
  if (dismissed) return null;
  const done = items.filter((item) => item.done).length;
  const allDone = done === items.length;
  const next = nextStep(items);

  return (
    <section aria-label={allDone ? "All set" : "Getting started"} className={FRAME}>
      <h2>{allDone ? "All set" : `Getting started · ${done} of ${items.length}`}</h2>
      {allDone ? (
        <>
          <p className="text-base text-muted-foreground">
            Everything on the list is done. You can hide this card.
          </p>
          <Button type="button" variant="outline" onClick={() => void dismiss()}>
            Hide for good
          </Button>
        </>
      ) : (
        <>
          <div aria-hidden="true" className="h-2 max-w-60 flex-[1_1_10rem] rounded-full bg-chip">
            <div
              className="h-2 rounded-full bg-mark-green"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
          {next && (
            <Link
              href={next.href}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto max-w-full py-2.5 text-left font-bold whitespace-normal",
              )}
            >
              {nextStepText(next)}
            </Link>
          )}
        </>
      )}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="checklist-steps"
        onClick={() => setExpanded((value) => !value)}
        className="rounded-md text-sm font-semibold text-link underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11"
      >
        {expanded ? "Hide steps" : "See all steps"}
      </button>
      {expanded && (
        <ul id="checklist-steps" className="grid basis-full gap-1 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-label={`${item.label}, ${item.done ? "done" : "not done yet"}`}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
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
      )}
      {failure && (
        <p role="alert" className="basis-full text-sm text-late">
          {failure}
        </p>
      )}
    </section>
  );
}
