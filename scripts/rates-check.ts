import { fetchEcbRates } from "@/lib/rates/ecb";
import { reportFailure } from "./report-failure";

async function main(): Promise<void> {
  const { onDate, rates } = await fetchEcbRates();
  console.log(`ECB rates of ${onDate}, rupees per unit:`);
  for (const [currency, rate] of Object.entries(rates)) {
    console.log(`  ${currency}: ${rate.toFixed(4)}`);
  }
}

main().catch(reportFailure);
