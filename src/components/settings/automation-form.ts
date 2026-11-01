import { rateAlertSchema, type CurrencyCode, type RateDirection, type Settings } from "@/types";

export const MAX_RATE_ALERTS = 3;

export type AutomationSettings = Pick<
  Settings,
  "prepareReminders" | "remindAfterDays" | "rateAlerts"
>;

export interface AlertRow {
  key: string;
  currency: CurrencyCode;
  direction: RateDirection;
  threshold: string;
}

export interface AutomationForm {
  prepareReminders: boolean;
  remindAfterDays: string;
  alerts: AlertRow[];
}

export function automationOf({
  prepareReminders,
  remindAfterDays,
  rateAlerts,
}: Settings): AutomationSettings {
  return { prepareReminders, remindAfterDays, rateAlerts };
}

export function newAlertRow(): AlertRow {
  return { key: crypto.randomUUID(), currency: "USD", direction: "above", threshold: "" };
}

export function toAutomationForm(settings: Settings): AutomationForm {
  return {
    prepareReminders: settings.prepareReminders,
    remindAfterDays: String(settings.remindAfterDays),
    alerts: settings.rateAlerts.map((alert) => ({
      key: crypto.randomUUID(),
      currency: alert.currency,
      direction: alert.direction,
      threshold: String(alert.threshold),
    })),
  };
}

type Converted = { ok: true; settings: AutomationSettings } | { ok: false; message: string };

export function toAutomationSettings(form: AutomationForm): Converted {
  const days = Number(form.remindAfterDays);
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    return { ok: false, message: "Use a whole number of days from 1 to 60." };
  }
  const rateAlerts = [];
  for (const row of form.alerts) {
    const parsed = rateAlertSchema.safeParse({
      currency: row.currency,
      direction: row.direction,
      threshold: row.threshold.trim() === "" ? Number.NaN : Number(row.threshold),
    });
    if (!parsed.success) {
      return { ok: false, message: "Enter a rate between ₹0 and ₹1,000 for every alert." };
    }
    rateAlerts.push(parsed.data);
  }
  if (rateAlerts.length > MAX_RATE_ALERTS) {
    return { ok: false, message: `You can set up to ${MAX_RATE_ALERTS} rate alerts.` };
  }
  return {
    ok: true,
    settings: { prepareReminders: form.prepareReminders, remindAfterDays: days, rateAlerts },
  };
}
