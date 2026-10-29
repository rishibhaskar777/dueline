import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Fees and rates" };

export default function SettingsPage() {
  return (
    <PageHeader
      title="Fees and rates"
      intro="Set your PayPal fee and how rupee amounts are estimated."
    />
  );
}
