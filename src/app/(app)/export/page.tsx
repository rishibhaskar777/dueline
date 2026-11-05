import type { Metadata } from "next";
import { Suspense } from "react";
import { ExportRegisterView } from "@/components/export/ExportRegisterView";
import { monthSchema } from "@/types";

export const metadata: Metadata = { title: "Export register" };

// The address can name the month to open; anything that is not YYYY-MM is ignored.
async function Register({ searchParams }: Pick<PageProps<"/export">, "searchParams">) {
  const { month } = await searchParams;
  const asked = monthSchema.safeParse(Array.isArray(month) ? month[0] : month);
  return <ExportRegisterView initialMonth={asked.success ? asked.data : null} />;
}

export default function ExportPage({ searchParams }: PageProps<"/export">) {
  return (
    <Suspense>
      <Register searchParams={searchParams} />
    </Suspense>
  );
}
