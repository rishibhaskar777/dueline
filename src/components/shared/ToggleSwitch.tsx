import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  // Names what the switch controls for a screen reader, e.g. "Show Forecast".
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

// On phones the button is 44 px tall around a 28 px track, so the control meets the touch target
// size while the track keeps its look.
export function ToggleSwitch({ label, checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group relative flex shrink-0 items-center justify-center rounded-full outline-none before:absolute before:-inset-2 before:content-[''] disabled:opacity-50 max-md:min-h-11 max-md:min-w-12"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors group-focus-visible:ring-3 group-focus-visible:ring-ring/50 max-md:h-7 max-md:w-12",
          checked ? "border-toggle-on bg-toggle-on" : "border-line bg-ground",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4.5 rounded-full shadow transition-transform motion-reduce:transition-none max-md:size-5.5",
            checked ? "translate-x-5 bg-white" : "bg-muted-foreground",
          )}
        />
      </span>
    </button>
  );
}
