"use client";

import { useId, useReducer, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { saveBankReference } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { initialReference, reduceReference, shouldSave } from "./bank-reference-state";

interface BankReferenceInputProps {
  invoiceId: string;
  invoiceNumber: string;
  initial: string | null;
  // Called when the text shown changes height, so a table can resize the row.
  onLayoutChange?: () => void;
}

// The bank's FIRC or e-BRC number, edited in place: Enter or leaving the box saves it, Escape puts
// back what was saved, and the server's complaint about the number is shown under the box.
export function BankReferenceInput({
  invoiceId,
  invoiceNumber,
  initial,
  onLayoutChange,
}: BankReferenceInputProps) {
  const errorId = useId();
  const [state, dispatch] = useReducer(reduceReference, initial, initialReference);

  async function save(): Promise<void> {
    if (!shouldSave(state)) return;
    dispatch({ type: "saving" });
    try {
      const stored = await saveBankReference(invoiceId, state.typed.trim());
      dispatch({ type: "saved", stored });
    } catch (caught) {
      dispatch({
        type: "failed",
        message: caught instanceof Error ? caught.message : "Could not save the number.",
      });
    }
    onLayoutChange?.();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: "escape" });
      onLayoutChange?.();
    }
  }

  return (
    <div className="grid gap-1 py-1">
      <Input
        aria-label={`FIRC or e-BRC number for invoice ${invoiceNumber}`}
        aria-invalid={state.error !== null}
        aria-describedby={state.error ? errorId : undefined}
        value={state.typed}
        maxLength={40}
        autoComplete="off"
        placeholder="Add number"
        // Read-only, not disabled, so the box keeps the focus and Escape still reaches it.
        readOnly={state.saving}
        onChange={(event) => dispatch({ type: "type", text: event.target.value })}
        onKeyDown={onKeyDown}
        onBlur={() => void save()}
        className={cn("h-9", !state.saved && !state.typed && "border-due-soon")}
      />
      {state.error && (
        <p id={errorId} role="alert" className="text-xs text-late">
          {state.error}
        </p>
      )}
    </div>
  );
}
