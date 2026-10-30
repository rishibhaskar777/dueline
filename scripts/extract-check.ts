import { readFile } from "node:fs/promises";
import { extractInvoiceDraft } from "@/lib/ai/extract-invoice";
import { reportFailure } from "./report-failure";

const SAMPLE_CHAT = "tests/fixtures/chats/halden-logos.txt";

async function main(): Promise<void> {
  const chat = await readFile(process.argv[2] ?? SAMPLE_CHAT, "utf8");
  const { draft, warnings, masked } = await extractInvoiceDraft(chat);

  console.log(JSON.stringify(draft, null, 2));
  console.log(`Masked before the AI call: ${masked.emails} email(s), ${masked.phones} phone(s)`);
  console.log(warnings.length > 0 ? `Warnings:\n- ${warnings.join("\n- ")}` : "No warnings");
}

main().catch(reportFailure);
