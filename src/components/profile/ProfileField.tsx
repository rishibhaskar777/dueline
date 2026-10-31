import type { ReactNode } from "react";
import { FieldError } from "@/components/invoices/FieldError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  className?: string;
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
  className,
}: ProfileFieldProps) {
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
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
        className={className}
      />
      {help && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
