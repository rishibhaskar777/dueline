import "server-only";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { getProfile } from "@/lib/profile";
import { getSettings } from "@/lib/settings";
import { getStore } from "@/lib/store";
import type { Checklist, ChecklistItem, Profile, Settings } from "@/types";

// A draft was never sent and a cancelled invoice no longer counts.
const NOT_SENT = ["DRAFT", "CANCELLED"];

interface ChecklistFacts {
  profile: Pick<Profile, "yourName" | "businessName" | "lutArn">;
  prepareReminders: Settings["prepareReminders"];
  anyInvoiceSent: boolean;
  exportDownloaded: boolean;
  dismissed: boolean;
}

export function buildChecklist(facts: ChecklistFacts): Checklist {
  const { profile } = facts;
  const items: ChecklistItem[] = [
    {
      id: "profile",
      label: "Fill in your business profile",
      done: profile.yourName.trim() !== "" && profile.businessName.trim() !== "",
      href: "/profile",
    },
    {
      id: "lut",
      label: "Add your LUT ARN",
      done: profile.lutArn !== null,
      href: "/profile",
    },
    {
      id: "first_invoice",
      label: "Send your first invoice",
      done: facts.anyInvoiceSent,
      href: "/invoices/new",
    },
    {
      id: "morning_reminders",
      label: "Have reminders prepared each morning",
      done: facts.prepareReminders,
      href: "/settings",
    },
    {
      id: "first_export",
      label: "Download your first export register",
      done: facts.exportDownloaded,
      href: "/export",
    },
  ];
  return { items, dismissed: facts.dismissed };
}

export async function getChecklist(): Promise<Checklist> {
  const store = getStore();
  const [profile, settings, loaded, exportDownloaded, dismissed] = await Promise.all([
    getProfile(),
    getSettings(),
    loadVisibleInvoices(),
    store.hasFlag("export_downloaded"),
    store.hasFlag("checklist_dismissed"),
  ]);
  return buildChecklist({
    profile,
    prepareReminders: settings.prepareReminders,
    anyInvoiceSent: loaded.some(({ summary }) => !NOT_SENT.includes(summary.paypalStatus)),
    exportDownloaded,
    dismissed,
  });
}

export async function dismissChecklist(): Promise<void> {
  await getStore().setFlag("checklist_dismissed");
}
