"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldError } from "@/components/invoices/FieldError";
import {
  lineTotal,
  newItem,
  type FieldErrors,
  type FormItem,
} from "@/components/invoices/invoice-form";
import { AddFromLibrary } from "@/components/library/AddFromLibrary";
import { isBlankItem } from "@/components/library/library-input";
import { SaveToLibraryButton } from "@/components/library/SaveToLibraryButton";
import { useLibrary } from "@/components/library/use-library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { CurrencyCode, LibraryItem } from "@/types";

// The columns of the header and of every row once the card is 768 px wide; below that a row wraps
// into two lines. The card, not the screen, decides: beside the summary it is narrow on a laptop.
const COLUMNS = "@3xl:grid-cols-[minmax(0,1fr)_110px_80px_120px_110px_88px]";

interface RowInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputMode?: "numeric" | "decimal";
}

// The header row names the columns on a wide screen, so the label is seen only below that.
function RowInput({ id, label, value, onChange, error, inputMode }: RowInputProps) {
  return (
    <div className="grid content-start gap-1">
      <Label htmlFor={id} className="text-[13px] font-semibold text-muted-foreground @3xl:sr-only">
        {label}
      </Label>
      <Input
        id={id}
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputMode ? "tabular-nums" : undefined}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface ItemsListProps {
  items: FormItem[];
  currency: CurrencyCode;
  errors: FieldErrors;
  defaultSac: string;
  onChange: (items: FormItem[]) => void;
}

export function ItemsList({ items, currency, errors, defaultSac, onChange }: ItemsListProps) {
  const library = useLibrary();
  const update = (key: string, changes: Partial<FormItem>) =>
    onChange(items.map((item) => (item.key === key ? { ...item, ...changes } : item)));

  function addFromLibrary(saved: LibraryItem): void {
    const row: FormItem = {
      ...newItem(saved.sac ?? defaultSac),
      name: saved.name,
      unitAmount: saved.unitAmount,
    };
    // A lone empty row is the starting point of a new invoice, so the item takes its place.
    onChange(items.length === 1 && isBlankItem(items[0]) ? [row] : [...items, row]);
  }

  return (
    <div className="@container grid gap-3">
      <div
        aria-hidden="true"
        className={cn(
          "hidden gap-3 text-sm font-semibold text-muted-foreground @3xl:grid",
          COLUMNS,
        )}
      >
        <span>Item</span>
        <span>SAC</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Total</span>
        <span />
      </div>
      <ul aria-label="Invoice items" className="grid gap-3">
        {items.map((item, index) => {
          const total = lineTotal(item, currency);
          const label = `Item ${index + 1}`;
          return (
            <li
              key={item.key}
              className={cn(
                "grid grid-cols-2 items-start gap-x-3 gap-y-2 border-t border-line pt-3",
                COLUMNS,
              )}
            >
              <div className="col-span-2 @3xl:col-span-1">
                <RowInput
                  id={`item-name-${item.key}`}
                  label={`${label} name`}
                  value={item.name}
                  onChange={(name) => update(item.key, { name })}
                  error={errors[`items.${index}.name`]}
                />
                {item.sourceQuote && (
                  <p className="mt-1.5 text-[13px] text-subtle">
                    From the chat: &ldquo;{item.sourceQuote}&rdquo;
                  </p>
                )}
              </div>
              <RowInput
                id={`item-sac-${item.key}`}
                label={`${label} SAC`}
                value={item.sac}
                onChange={(sac) => update(item.key, { sac })}
                error={errors[`items.${index}.sac`]}
                inputMode="numeric"
              />
              <RowInput
                id={`item-quantity-${item.key}`}
                label={`${label} quantity`}
                value={item.quantity}
                onChange={(quantity) => update(item.key, { quantity })}
                error={errors[`items.${index}.quantity`]}
                inputMode="numeric"
              />
              <RowInput
                id={`item-price-${item.key}`}
                label={`${label} unit price`}
                value={item.unitAmount}
                onChange={(unitAmount) => update(item.key, { unitAmount })}
                error={errors[`items.${index}.unitAmount`]}
                inputMode="decimal"
              />
              <p className="flex items-baseline justify-between gap-2 @3xl:justify-end @3xl:pt-3">
                <span className="text-[13px] font-semibold text-muted-foreground @3xl:sr-only">
                  Line total
                </span>
                <span className="font-semibold tabular-nums">
                  {total ? formatMoney(total) : "—"}
                </span>
              </p>
              <div className="col-span-2 flex justify-end @3xl:col-span-1">
                <SaveToLibraryButton
                  item={item}
                  currency={currency}
                  label={label.toLowerCase()}
                  onSaved={library.reload}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={items.length === 1}
                  onClick={() => onChange(items.filter((other) => other.key !== item.key))}
                  aria-label={`Remove ${label.toLowerCase()}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <FieldError id="items-error" message={errors.items} />
      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-bold"
          onClick={() => onChange([...items, newItem(defaultSac)])}
        >
          <Plus aria-hidden data-icon="inline-start" />
          Add item
        </Button>
        <AddFromLibrary items={library.items} currency={currency} onPick={addFromLibrary} />
      </div>
    </div>
  );
}
