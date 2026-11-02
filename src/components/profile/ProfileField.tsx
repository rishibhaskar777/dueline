import type { ReactNode } from "react";
import { FieldError } from "@/components/invoices/FieldError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProfileFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  help?: ReactNode;
  type?: "text" | "date";
  inputMode?: "numeric";
  maxLength?: number;
  placeholder?: string;
  // Spans both columns of the form grid.
  wide?: boolean;
}

export function ProfileField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  help,
  type = "text",
  inputMode,
  maxLength,
  placeholder,
  wide,
}: ProfileFieldProps) {
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("grid content-start gap-1.5", wide && "sm:col-span-2")}>
      <Label htmlFor={id} className="font-bold">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className="h-[50px] rounded-[14px] px-3.5 text-base font-medium"
      />
      {help && (
        <p id={`${id}-help`} className="text-[13px] text-subtle">
          {help}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
