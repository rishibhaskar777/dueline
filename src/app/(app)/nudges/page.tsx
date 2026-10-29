import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Nudges" };

export default function NudgesPage() {
  return (
    <PageHeader
      title="Nudges"
      intro="A reminder is drafted for each late invoice. You read it and send it."
    />
  );
}
