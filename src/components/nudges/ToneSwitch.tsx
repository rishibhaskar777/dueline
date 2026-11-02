import { cn } from "@/lib/utils";
import type { Tone } from "@/types";
import { TONE_LABELS } from "./nudge-model";

const TONES: Tone[] = ["gentle", "firm", "final"];

interface ToneSwitchProps {
  tone: Tone;
  suggestedTone: Tone;
  disabled: boolean;
  onChange: (tone: Tone) => void;
}

export function ToneSwitch({ tone, suggestedTone, disabled, onChange }: ToneSwitchProps) {
  return (
    <div role="group" aria-label="Tone" className="flex flex-wrap gap-2">
      {TONES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === tone}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            "flex min-h-9 max-md:min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
            option === tone
              ? "btn-primary border-transparent"
              : "btn-secondary border-transparent hover:bg-hover",
          )}
        >
          {TONE_LABELS[option]}
          {option === suggestedTone && (
            <span className="text-xs font-normal opacity-90">Suggested</span>
          )}
        </button>
      ))}
    </div>
  );
}
