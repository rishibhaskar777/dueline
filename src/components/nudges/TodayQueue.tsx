"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { dismissQueueItem, getQueue } from "@/lib/api-client";
import { useLoad } from "@/components/shared/use-load";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/types";

const BAND_PILL = "h-11 px-5 font-bold max-sm:flex-1";

function reviewHref(item: QueueItem): string {
  return item.repeatId
    ? `/invoices/new?repeat=${encodeURIComponent(item.repeatId)}`
    : `#invoice-${encodeURIComponent(item.invoiceId ?? "")}`;
}

interface QueueRowProps {
  item: QueueItem;
  // The first item carries the reassurance that nothing goes out on its own.
  first: boolean;
  onDismiss: () => void;
}

function QueueRow({ item, first, onDismiss }: QueueRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3.5 border-t border-white/20 py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <p className="min-w-0 flex-1 basis-80 text-[15px] text-navy-card-muted">
        <span className="font-semibold text-white">{item.title}</span> · {item.detail}
        {first && " Nothing is sent until you press a button."}
      </p>
      <div className="flex gap-2 max-sm:w-full">
        <Link
          href={reviewHref(item)}
          className={cn(
            buttonVariants({ variant: null }),
            BAND_PILL,
            "bg-white text-navy hover:bg-white",
          )}
        >
          Review and send
        </Link>
        <Button
          type="button"
          variant={null}
          className={cn(BAND_PILL, "border-white/30 bg-white/16 text-white")}
          onClick={onDismiss}
        >
          {item.kind === "reminder" ? "Dismiss for today" : "Dismiss"}
        </Button>
      </div>
    </li>
  );
}

// What the morning run prepared. Nothing in it has been sent; each item is a draft to open.
export function TodayQueue() {
  const { state } = useLoad(getQueue);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  if (state.kind !== "ready") return null;
  const items = state.data.filter(({ id }) => !dismissed.includes(id));
  if (items.length === 0) return null;

  async function dismiss(id: string): Promise<void> {
    setFailure(null);
    try {
      await dismissQueueItem(id);
      setDismissed((previous) => [...previous, id]);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not dismiss that item.");
    }
  }

  return (
    <section
      aria-labelledby="today-title"
      className="rounded-[24px] bg-navy-card px-[26px] py-[22px] text-white"
    >
      <h2 id="today-title" className="font-heading text-[22px] font-extrabold">
        Today · prepared by the morning run
      </h2>
      <ul className="mt-3">
        {items.map((item, index) => (
          <QueueRow
            key={item.id}
            item={item}
            first={index === 0}
            onDismiss={() => void dismiss(item.id)}
          />
        ))}
      </ul>
      {failure && (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-late"
        >
          {failure}
        </p>
      )}
    </section>
  );
}
