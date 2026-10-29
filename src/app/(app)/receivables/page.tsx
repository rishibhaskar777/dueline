import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Receivables" };

export default function ReceivablesPage() {
  return (
    <PageHeader
      title="Money owed to you"
      intro="Each invoice is a line from the day you sent it to the day it was paid."
    />
  );
}
