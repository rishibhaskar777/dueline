import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { DemoCard } from "@/components/demo/DemoCard";

export const metadata: Metadata = { title: "Demo tools" };

export default function DemoToolsPage() {
  return (
    <>
      <PageHeader title="Demo tools" intro="Put the sandbox back to the sample story." />
      <DemoCard />
    </>
  );
}
