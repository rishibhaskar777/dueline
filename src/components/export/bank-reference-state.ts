export interface ReferenceState {
  // The last value the server holds.
  saved: string;
  typed: string;
  saving: boolean;
  error: string | null;
}

export function initialReference(saved: string | null): ReferenceState {
  return { saved: saved ?? "", typed: saved ?? "", saving: false, error: null };
}

export type ReferenceAction =
  | { type: "type"; text: string }
  | { type: "escape" }
  | { type: "saving" }
  | { type: "saved"; stored: string | null }
  | { type: "failed"; message: string };

export function reduceReference(state: ReferenceState, action: ReferenceAction): ReferenceState {
  switch (action.type) {
    case "type":
      return { ...state, typed: action.text };
    // Escape always puts back what is saved and drops the complaint, whatever happened before.
    case "escape":
      return { ...state, typed: state.saved, error: null };
    case "saving":
      return { ...state, saving: true, error: null };
    case "saved": {
      const stored = action.stored ?? "";
      return { saved: stored, typed: stored, saving: false, error: null };
    }
    case "failed":
      return { ...state, saving: false, error: action.message };
  }
}

// Enter and leaving the box both save, but only a change that is not already being saved.
export function shouldSave(state: ReferenceState): boolean {
  return !state.saving && state.typed.trim() !== state.saved;
}
