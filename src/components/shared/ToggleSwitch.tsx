import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  // Names what the switch controls for a screen reader, e.g. "Show Forecast".
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ label, checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border before:absolute before:-inset-2 before:content-[''] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 max-md:h-7 max-md:w-12",
        checked ? "border-primary bg-primary" : "border-line bg-ground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0.5 left-0.5 size-4.5 rounded-full shadow transition-transform motion-reduce:transition-none max-md:size-5.5",
          checked ? "translate-x-5 bg-primary-foreground" : "bg-muted-foreground",
        )}
      />
    </button>
  );
}
