import { seedDemo } from "@/lib/demo/seed";
import { reportFailure } from "./report-failure";

async function main(): Promise<void> {
  const rows = await seedDemo();
  console.table(rows);
  if (rows.some((row) => row.result === "failed")) process.exitCode = 1;
}

main().catch(reportFailure);
