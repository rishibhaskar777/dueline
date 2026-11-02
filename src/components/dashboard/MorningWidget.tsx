"use client";

import Link from "next/link";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useLoad } from "@/components/shared/use-load";
import { getDigest } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { digestLines, type DigestLine } from "./digest-lines";

const DOTS = { late: "bg-mark-red", "due-soon": "bg-mark-amber" } as const;

const STRIP =
  "surface flex flex-wrap items-center gap-x-7 gap-y-3 px-6 py-[18px] [--h2-size:18px] [--h2-tracking:0] [--h2-weight:700]";

export function MorningWidget() {
  const { state, reload } = useLoad(getDigest);

  return (
    <section aria-labelledby="morning-title" aria-busy={state.kind === "loading"} className={STRIP}>
      <h2 id="morning-title">This morning</h2>
      {state.kind === "loading" && <SkeletonBlock className="h-6 w-64" />}
      {state.kind === "error" && (
        <p role="alert" className="text-base">
          {state.error.message}{" "}
          <button type="button" onClick={reload} className="text-link underline underline-offset-2">
            Try again
          </button>
        </p>
      )}
      {state.kind === "ready" && <Lines digest={state.data} />}
    </section>
  );
}

function Item({ line }: { line: DigestLine }) {
  if (line.href) {
    return (
      <Link href={line.href} className="text-base font-semibold text-link underline">
        {line.text} →
      </Link>
    );
  }
  const dot = (line.tone && line.tone !== "paid" && DOTS[line.tone]) || "bg-blue-line";
  return (
    <p className="flex items-center gap-2 text-base">
      <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", dot)} />
      <span>
        <span className="font-semibold">{line.label}:</span> {line.text}
      </span>
    </p>
  );
}

function Lines({ digest }: { digest: Parameters<typeof digestLines>[0] }) {
  const lines = digestLines(digest);
  if (lines.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        Nothing new as of {formatDate(digest.day)}. Nothing is due soon and nothing is overdue.
      </p>
    );
  }
  return (
    <>
      {lines.map((line) => (
        <Item key={line.key} line={line} />
      ))}
    </>
  );
}
