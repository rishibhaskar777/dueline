"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { NotifyToggle } from "@/components/notifications/NotifyToggle";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSettings, saveSettings } from "@/lib/api-client";
import { toAutomationForm, toAutomationSettings, type AutomationForm } from "./automation-form";
import { RateAlertFields } from "./RateAlertFields";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Could not save your settings.";
}

export function AutomationSettings() {
  const [form, setForm] = useState<AutomationForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    getSettings().then(
      (loaded) => current && setForm(toAutomationForm(loaded)),
      (error: unknown) => current && setLoadError(errorText(error)),
    );
    return () => {
      current = false;
    };
  }, []);

  if (loadError)
    return (
      <p role="alert" className="text-sm text-late">
        {loadError}
      </p>
    );
  if (!form) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form) return;
    const converted = toAutomationSettings(form);
    if (!converted.ok) {
      setSaveError(converted.message);
      return;
    }
    setPending(true);
    setSaveError(null);
    try {
      // Read again first, so a change made on the fees form in the meantime is not undone.
      await saveSettings({ ...(await getSettings()), ...converted.settings });
      toast.success("Settings saved");
    } catch (error) {
      setSaveError(errorText(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      aria-labelledby="automation-title"
      className="surface flex flex-col gap-3.5 p-6 [--h2-size:20px] [--h2-tracking:-0.2px] [--surface-radius:24px]"
    >
      <h2 id="automation-title">Each morning</h2>
      <p className="text-sm text-muted-foreground">
        Dueline writes reminder drafts and lists them under Nudges. Nothing is sent until you click
        send.
      </p>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">Prepare reminder drafts</span>
        <ToggleSwitch
          label="Prepare reminder drafts each morning"
          checked={form.prepareReminders}
          onChange={(prepareReminders) => setForm({ ...form, prepareReminders })}
        />
      </div>
      <div className="flex items-center justify-between gap-3 font-semibold">
        <span>Remind me after</span>
        <span className="flex items-center gap-2">
          <Input
            id="remind-after"
            aria-label="Remind me when an invoice is this many days late"
            inputMode="numeric"
            autoComplete="off"
            value={form.remindAfterDays}
            onChange={(event) => setForm({ ...form, remindAfterDays: event.target.value })}
            className="h-10 w-[70px] rounded-xl px-2 text-center font-semibold tabular-nums"
          />
          <span aria-hidden="true">days late</span>
        </span>
      </div>
      <NotifyToggle />
      <RateAlertFields alerts={form.alerts} onChange={(alerts) => setForm({ ...form, alerts })} />
      {saveError && (
        <p role="alert" className="text-sm font-semibold text-late">
          {saveError}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-end px-5 font-bold">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
