"use client";

import { useState } from "react";
import { suggestionQuestion } from "@/components/shared/language-suggestion";
import { Button } from "@/components/ui/button";
import { saveClientLanguage } from "@/lib/api-client";
import { languageInfo } from "@/lib/reminders/languages";
import type { ReminderLanguage } from "@/types";

interface LanguageSuggestionProps {
  clientKey: string;
  clientName: string;
  country: string | null | undefined;
  suggestion: ReminderLanguage;
  disabled?: boolean;
  // Either answer is saved as the client's language; this runs once it is.
  onChosen: (language: ReminderLanguage) => void;
}

// Reminders are never switched to another language silently: the freelancer answers, and "Keep
// English" is an answer too, so the question does not come back.
export function LanguageSuggestion({
  clientKey,
  clientName,
  country,
  suggestion,
  disabled = false,
  onChosen,
}: LanguageSuggestionProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(language: ReminderLanguage): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await saveClientLanguage(clientKey, language);
      onChosen(language);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the language.");
      setSaving(false);
    }
  }

  return (
    <section
      aria-label="Reminder language suggestion"
      className="grid gap-2.5 rounded-[20px] bg-tint-blue px-5 py-3.5"
    >
      <p className="text-[15px] font-semibold text-blue">
        {suggestionQuestion(clientName, country, suggestion)}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          size="sm"
          className="font-bold"
          disabled={saving || disabled}
          onClick={() => void choose(suggestion)}
        >
          Use {languageInfo(suggestion).name}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="font-bold"
          disabled={saving || disabled}
          onClick={() => void choose("en")}
        >
          Keep English
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-late">
          {error}
        </p>
      )}
    </section>
  );
}
