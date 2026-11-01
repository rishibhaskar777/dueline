import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Fees and rates" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Fees and rates"
        intro="Set your PayPal fee, how rupee amounts are estimated, and what Dueline prepares each morning."
      />
      <div className="grid gap-6">
        <SettingsForm />
        <div className="max-w-xl">
          <AutomationSettings />
        </div>
      </div>
    </>
  );
}
