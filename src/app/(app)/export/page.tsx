import type { Metadata } from "next";
import { ExportRegisterView } from "@/components/export/ExportRegisterView";

export const metadata: Metadata = { title: "Export register" };

export default function ExportPage() {
  return <ExportRegisterView />;
}
