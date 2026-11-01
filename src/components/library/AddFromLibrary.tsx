"use client";

import { Library } from "lucide-react";
import { useState } from "react";
import { SearchList } from "@/components/shared/SearchList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money/format";
import type { CurrencyCode, LibraryItem } from "@/types";

interface AddFromLibraryProps {
  items: LibraryItem[];
  currency: CurrencyCode;
  onPick: (item: LibraryItem) => void;
}

export function AddFromLibrary({ items, currency, onPick }: AddFromLibraryProps) {
  const [open, setOpen] = useState(false);
  const inCurrency = items.filter((item) => item.currency === currency);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Library aria-hidden data-icon="inline-start" />
        Add from library
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Add from library</DialogTitle>
            <DialogDescription>Saved items priced in {currency}.</DialogDescription>
          </DialogHeader>
          <SearchList
            label="Search saved items"
            placeholder="Search by name"
            emptyText={
              items.length === 0
                ? "Nothing saved yet. Use Save to library on an item."
                : `No saved items in ${currency} match.`
            }
            options={inCurrency.map((item) => ({
              id: item.id,
              label: item.name,
              hint: formatMoney({ currency: item.currency, value: item.unitAmount }),
            }))}
            onChoose={(id) => {
              const chosen = inCurrency.find((item) => item.id === id);
              if (chosen) onPick(chosen);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
