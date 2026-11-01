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
import type { CurrencyCode, LibraryItem } from "@/types";

interface RowInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputMode?: "numeric" | "decimal";
}

function RowInput({ id, label, value, onChange, error, inputMode }: RowInputProps) {
  return (
    <>
      <Label htmlFor={id} className="sr-only">
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
    </>
  );
}

interface ItemsTableProps {
  items: FormItem[];
  currency: CurrencyCode;
  errors: FieldErrors;
  defaultSac: string;
  onChange: (items: FormItem[]) => void;
}

export function ItemsTable({ items, currency, errors, defaultSac, onChange }: ItemsTableProps) {
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
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">Invoice items</caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">
                Item
              </th>
              <th scope="col" className="w-28 py-2 pr-3 font-medium">
                SAC
              </th>
              <th scope="col" className="w-24 py-2 pr-3 font-medium">
                Quantity
              </th>
              <th scope="col" className="w-32 py-2 pr-3 font-medium">
                Unit price
              </th>
              <th scope="col" className="w-32 py-2 pr-3 text-right font-medium">
                Line total
              </th>
              <th scope="col" className="w-24 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item, index) => {
              const total = lineTotal(item, currency);
              const label = `Item ${index + 1}`;
              return (
                <tr key={item.key} className="align-top">
                  <td className="py-2 pr-3">
                    <RowInput
                      id={`item-name-${item.key}`}
                      label={`${label} name`}
                      value={item.name}
                      onChange={(name) => update(item.key, { name })}
                      error={errors[`items.${index}.name`]}
                    />
                    {item.sourceQuote && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        From the chat: &ldquo;{item.sourceQuote}&rdquo;
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <RowInput
                      id={`item-sac-${item.key}`}
                      label={`${label} SAC`}
                      value={item.sac}
                      onChange={(sac) => update(item.key, { sac })}
                      error={errors[`items.${index}.sac`]}
                      inputMode="numeric"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <RowInput
                      id={`item-quantity-${item.key}`}
                      label={`${label} quantity`}
                      value={item.quantity}
                      onChange={(quantity) => update(item.key, { quantity })}
                      error={errors[`items.${index}.quantity`]}
                      inputMode="numeric"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <RowInput
                      id={`item-price-${item.key}`}
                      label={`${label} unit price`}
                      value={item.unitAmount}
                      onChange={(unitAmount) => update(item.key, { unitAmount })}
                      error={errors[`items.${index}.unitAmount`]}
                      inputMode="decimal"
                    />
                  </td>
                  <td className="py-2 pt-4 pr-3 text-right tabular-nums">
                    {total ? formatMoney(total) : "—"}
                  </td>
                  <td className="py-2">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FieldError id="items-error" message={errors.items} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
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
