import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Fees and rates" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Fees and rates"
        intro="How rupee amounts are estimated, and what Dueline prepares each morning."
      />
      <SettingsForm />
    </>
  );
}
