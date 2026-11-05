"use client";

import Link from "next/link";
import { useDemoMode } from "@/components/demo/use-demo-mode";
import { Button } from "@/components/ui/button";
import { setWidgetVisible } from "./dashboard-layout";
import { tourSteps, type TourContext } from "./tour-steps";
import { useLayout } from "./use-layout";

// A way round the demo for someone who has not read the README. Dismissing hides it in this browser
// like any other widget, and Customise brings it back.
export function TourWidget(context: TourContext) {
  const inDemo = useDemoMode();
  const { layout, change } = useLayout();
  if (!inDemo) return null;

  return (
    <section
      aria-labelledby="tour-title"
      className="surface px-6 py-5 [--h2-size:20px] [--h2-tracking:0] [--h2-weight:700]"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="grid min-w-0 gap-1">
          <h2 id="tour-title">Tour the demo</h2>
          <p className="text-sm text-muted-foreground">
            Two minutes through every feature. Each step opens the place it is about.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => change(setWidgetVisible(layout, "tour", false))}
        >
          Dismiss
        </Button>
      </div>
      <ol className="mt-4 grid list-decimal gap-x-10 gap-y-3 pl-5 marker:font-bold marker:text-muted-foreground md:grid-cols-2">
        {tourSteps(context).map(({ title, text, href }) => (
          <li key={title} className="min-w-0 pl-1 text-[15px] leading-normal">
            <Link
              href={href}
              className="rounded-sm font-bold text-link underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {title}
            </Link>{" "}
            {text}
          </li>
        ))}
      </ol>
    </section>
  );
}
