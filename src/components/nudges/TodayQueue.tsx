"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants, Button } from "@/components/ui/button";
import { dismissQueueItem, getQueue } from "@/lib/api-client";
import { useLoad } from "@/components/shared/use-load";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/types";

function reviewHref(item: QueueItem): string {
  return item.repeatId
    ? `/invoices/new?repeat=${encodeURIComponent(item.repeatId)}`
    : `#invoice-${encodeURIComponent(item.invoiceId ?? "")}`;
}

function QueueRow({ item, onDismiss }: { item: QueueItem; onDismiss: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-medium">{item.title}</p>
        <p className="text-sm text-muted-foreground">{item.detail}</p>
      </div>
      <div className="flex gap-2">
        <Link href={reviewHref(item)} className={cn(buttonVariants({ variant: "default" }))}>
          Review and send
        </Link>
        <Button type="button" variant="outline" onClick={onDismiss}>
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
      className="max-w-3xl rounded-xl border border-line bg-card p-6"
    >
      <h2 id="today-title" className="text-xl font-semibold">
        Today
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Prepared by the morning run. Items stay until you send or dismiss them. Nothing is sent
        until you review it and click send.
      </p>
      <ul className="mt-2 divide-y divide-line">
        {items.map((item) => (
          <QueueRow key={item.id} item={item} onDismiss={() => void dismiss(item.id)} />
        ))}
      </ul>
      {failure && (
        <p role="alert" className="mt-2 text-sm text-late">
          {failure}
        </p>
      )}
    </section>
  );
}
