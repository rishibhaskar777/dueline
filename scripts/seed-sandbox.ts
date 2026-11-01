import { seedDemo, seedNewGeneration } from "@/lib/demo/seed";
import { getStore } from "@/lib/store";
import { reportFailure } from "./report-failure";

// Creates what the current story generation is missing, or the first generation when there is none.
async function main(): Promise<void> {
  const current = await getStore().getDemoGeneration();
  const rows = current ? await seedDemo(current.id) : (await seedNewGeneration()).rows;
  console.table(rows);
  if (rows.some((row) => row.result === "failed")) process.exitCode = 1;
}

main().catch(reportFailure);
