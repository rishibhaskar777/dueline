"use client";

import { Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { FormItem } from "@/components/invoices/invoice-form";
import { Button } from "@/components/ui/button";
import { saveLibraryItem } from "@/lib/api-client";
import type { CurrencyCode } from "@/types";
import { libraryInputFrom } from "./library-input";

interface SaveToLibraryButtonProps {
  item: FormItem;
  currency: CurrencyCode;
  label: string;
  onSaved: () => void;
}

export function SaveToLibraryButton({ item, currency, label, onSaved }: SaveToLibraryButtonProps) {
  const [pending, setPending] = useState(false);

  async function save(): Promise<void> {
    const converted = libraryInputFrom(item, currency);
    if (!converted.ok) {
      toast.error(converted.message);
      return;
    }
    setPending(true);
    try {
      await saveLibraryItem(converted.item);
      toast.success("Saved to library");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={`Save ${label} to library`}
      title="Save to library"
      onClick={() => void save()}
    >
      <Bookmark aria-hidden />
    </Button>
  );
}
