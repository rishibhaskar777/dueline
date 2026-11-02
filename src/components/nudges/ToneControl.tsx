import { Segmented } from "@/components/shared/Segmented";
import type { Tone } from "@/types";
import { TONE_LABELS, toneOptionLabel } from "./nudge-model";

const TONES: Tone[] = ["gentle", "firm", "final"];

interface ToneControlProps {
  tone: Tone;
  suggestedTone: Tone;
  disabled: boolean;
  onChange: (tone: Tone) => void;
}

// On a phone the suggestion is a dot, to keep the three options on one line; the words stay for
// assistive technology.
function ToneLabel({ tone, suggestedTone }: Pick<ToneControlProps, "tone" | "suggestedTone">) {
  const label = toneOptionLabel(tone, suggestedTone);
  if (tone !== suggestedTone) return label;
  return (
    <>
      {TONE_LABELS[tone]}
      <span aria-hidden="true" className="sm:hidden">
        {" •"}
      </span>
      <span className="max-sm:sr-only">{label.slice(TONE_LABELS[tone].length)}</span>
    </>
  );
}

export function ToneControl({ tone, suggestedTone, disabled, onChange }: ToneControlProps) {
  return (
    <Segmented
      label="Tone"
      size="sm"
      disabled={disabled}
      value={tone}
      onChange={onChange}
      options={TONES.map((option) => ({
        value: option,
        label: <ToneLabel tone={option} suggestedTone={suggestedTone} />,
      }))}
    />
  );
}
