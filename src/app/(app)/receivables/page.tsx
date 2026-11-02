import type { Metadata } from "next";
import { Receivables } from "@/components/receivables/Receivables";

export const metadata: Metadata = { title: "Receivables" };

export default function ReceivablesPage() {
  return <Receivables />;
}
