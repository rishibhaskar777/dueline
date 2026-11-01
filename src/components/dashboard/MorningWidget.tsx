"use client";

import Link from "next/link";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";
import { useLoad } from "@/components/shared/use-load";
import { getDigest } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { digestLines } from "./digest-lines";

const TONES = { paid: "text-paid", late: "text-late", "due-soon": "text-due-soon" } as const;

export function MorningWidget() {
  const { state, reload } = useLoad(getDigest);

  return (
    <section
      aria-labelledby="morning-title"
      aria-busy={state.kind === "loading"}
      className="rounded-xl border border-line bg-card p-6"
    >
      <h2 id="morning-title" className="text-xl font-semibold">
        This morning
      </h2>
      {state.kind === "loading" && <SkeletonBlock className="mt-4 h-16" />}
      {state.kind === "error" && (
        <p role="alert" className="mt-3 text-sm">
          {state.error.message}{" "}
          <button type="button" onClick={reload} className="text-blue underline underline-offset-2">
            Try again
          </button>
        </p>
      )}
      {state.kind === "ready" && <Lines digest={state.data} />}
    </section>
  );
}

function Lines({ digest }: { digest: Parameters<typeof digestLines>[0] }) {
  const lines = digestLines(digest);
  if (lines.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Nothing new as of {formatDate(digest.day)}. Nothing is due soon and nothing is overdue.
      </p>
    );
  }
  return (
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[12rem_1fr]">
      {lines.map((line) => (
        <div key={line.key} className="contents">
          <dt className="font-medium">{line.label}</dt>
          <dd className={cn(line.tone && TONES[line.tone])}>
            {line.href ? (
              <Link href={line.href} className="underline underline-offset-2">
                {line.text}
              </Link>
            ) : (
              line.text
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
