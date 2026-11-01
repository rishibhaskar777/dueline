"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { NotifyToggle } from "@/components/notifications/NotifyToggle";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      className="grid gap-5 rounded-xl border border-line bg-card p-6"
    >
      <div>
        <h2 id="automation-title" className="text-xl font-semibold">
          Daily preparation and alerts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each morning Dueline writes reminder drafts and lists them under Nudges. Nothing is sent
          until you click send.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Prepare reminder drafts each morning</span>
        <ToggleSwitch
          label="Prepare reminder drafts each morning"
          checked={form.prepareReminders}
          onChange={(prepareReminders) => setForm({ ...form, prepareReminders })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="remind-after">Remind me when an invoice is this many days late</Label>
        <Input
          id="remind-after"
          inputMode="numeric"
          autoComplete="off"
          value={form.remindAfterDays}
          onChange={(event) => setForm({ ...form, remindAfterDays: event.target.value })}
          className="w-24 tabular-nums"
        />
      </div>
      <RateAlertFields alerts={form.alerts} onChange={(alerts) => setForm({ ...form, alerts })} />
      <NotifyToggle />
      {saveError && (
        <p role="alert" className="text-sm text-late">
          {saveError}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
