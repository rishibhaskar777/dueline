"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteLibraryItem, saveLibraryItem } from "@/lib/api-client";
import { formatMoney } from "@/lib/money/format";
import type { LibraryItem } from "@/types";
import { useLibrary } from "./use-library";

function LibraryRow({ item, onChanged }: { item: LibraryItem; onChanged: () => void }) {
  const [name, setName] = useState(item.name);
  const [pending, setPending] = useState(false);

  async function change(work: () => Promise<unknown>, done: string): Promise<void> {
    setPending(true);
    try {
      await work();
      toast.success(done);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change this item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-wrap items-end gap-2 py-3">
      <div className="grid min-w-48 flex-1 gap-1.5">
        <Label htmlFor={`library-${item.id}`}>Name</Label>
        <Input
          id={`library-${item.id}`}
          value={name}
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <p className="pb-2 text-sm tabular-nums">
        {formatMoney({ currency: item.currency, value: item.unitAmount })}
        {item.sac && <span className="text-muted-foreground"> · SAC {item.sac}</span>}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={pending || name.trim() === "" || name.trim() === item.name}
        onClick={() =>
          void change(() => saveLibraryItem({ ...item, name: name.trim() }), "Renamed")
        }
      >
        Rename
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label={`Delete ${item.name}`}
        onClick={() => void change(() => deleteLibraryItem(item.id), "Deleted")}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}

export function LibraryManager() {
  const { items, reload } = useLibrary();

  return (
    <section aria-labelledby="library-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="library-title" className="text-xl font-semibold">
        Item library
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Items you saved from New invoice, ready to add to the next one.
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((item) => (
            <LibraryRow key={`${item.id}:${item.name}`} item={item} onChanged={reload} />
          ))}
        </ul>
      )}
    </section>
  );
}
