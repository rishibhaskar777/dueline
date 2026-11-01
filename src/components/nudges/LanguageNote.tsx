import { Button } from "@/components/ui/button";
import { languageInfo } from "@/lib/reminders/languages";
import type { ReminderLanguage } from "@/types";

interface LanguageNoteProps {
  // The language saved for this client, and the one the draft is in now.
  clientLanguage: ReminderLanguage;
  language: ReminderLanguage;
  disabled: boolean;
  onChange: (language: ReminderLanguage) => void;
}

// Says which language the reminder is in, and offers the other one: English, or back to the client's.
export function LanguageNote({ clientLanguage, language, disabled, onChange }: LanguageNoteProps) {
  if (clientLanguage === "en") return null;
  const other = language === "en" ? clientLanguage : "en";

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>Written in {languageInfo(language).name}.</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange(other)}
      >
        Write in {languageInfo(other).name}
      </Button>
    </p>
  );
}
