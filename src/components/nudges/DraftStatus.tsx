import { IMPROVING_NOTE, KEPT_EDITS_NOTE, sourceNote } from "./nudge-model";
import type { useNudgeDraft } from "./use-nudge-draft";

type Nudge = ReturnType<typeof useNudgeDraft>;

function statusText({ improving, drafting, keptYours, draft }: Nudge): string {
  if (improving) return IMPROVING_NOTE;
  if (drafting) return "Writing a new draft…";
  return keptYours ? KEPT_EDITS_NOTE : sourceNote(draft.source);
}

export function DraftStatus({ nudge }: { nudge: Nudge }) {
  return (
    <p role="status" className="text-xs text-muted-foreground">
      {statusText(nudge)}
    </p>
  );
}
