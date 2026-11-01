"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveClientLanguage } from "@/lib/api-client";
import { LANGUAGES } from "@/lib/reminders/languages";
import type { ReminderLanguage } from "@/types";

const ITEMS = LANGUAGES.map(({ code, name }) => ({ value: code, label: name }));

interface ReminderLanguageCardProps {
  clientKey: string;
  initial: ReminderLanguage;
}

export function ReminderLanguageCard({ clientKey, initial }: ReminderLanguageCardProps) {
  const [language, setLanguage] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function change(next: ReminderLanguage): Promise<void> {
    const previous = language;
    setLanguage(next);
    setMessage(null);
    try {
      await saveClientLanguage(clientKey, next);
      setMessage({ ok: true, text: "Saved. New reminder drafts use this language." });
    } catch (error) {
      setLanguage(previous);
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Could not save the language.",
      });
    }
  }

  return (
    <section aria-labelledby="language-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="language-title" className="text-xl font-semibold">
        Reminder language
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reminder drafts for this client are written in this language. You can still switch a draft
        back to English on Nudges.
      </p>
      <div className="mt-3 grid gap-1.5">
        <Label id="language-label">Language</Label>
        <Select
          value={language}
          items={ITEMS}
          onValueChange={(value) => value && void change(value)}
        >
          <SelectTrigger aria-labelledby="language-label" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "mt-2 text-sm" : "mt-2 text-sm text-late"}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
