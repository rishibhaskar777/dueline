import { Button } from "@/components/ui/button";
import type { Tone } from "@/types";
import { replaceEditsQuestion } from "./nudge-model";

interface ReplaceEditsPromptProps {
  tone: Tone;
  onReplace: () => void;
  onKeepEditing: () => void;
}

export function ReplaceEditsPrompt({ tone, onReplace, onKeepEditing }: ReplaceEditsPromptProps) {
  return (
    <div
      role="group"
      aria-label="Replace your edits"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-due-soon bg-due-soon/10 p-3 text-sm"
    >
      <p className="font-medium">{replaceEditsQuestion(tone)}</p>
      <Button type="button" size="sm" onClick={onReplace}>
        Replace
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onKeepEditing}>
        Keep editing
      </Button>
    </div>
  );
}
