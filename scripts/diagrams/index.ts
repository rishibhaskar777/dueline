// Draws the animated diagrams in docs/media/architecture/. Run with tsx, no extra packages.
// Run it from the repository root with `npm run diagrams`. It is a documentation tool: CI does
// not run it, and its output is committed, so a diagram changes only when this folder does.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { systemContext } from "./system-context";
import { insideTheApp } from "./inside-the-app";
import { draftFromChat } from "./draft-from-chat";
import { createSendOnce } from "./create-send-once";
import { paymentReaches } from "./payment-reaches";
import { depositBalance } from "./deposit-balance";
import { remindersFlow } from "./reminders";
import { morningRun } from "./morning-run";
import { dataAndSnapshot } from "./data-and-snapshot";
import { manyFreelancers } from "./many-freelancers";

const out = fileURLToPath(new URL("../../docs/media/architecture/", import.meta.url));
mkdirSync(out, { recursive: true });

for (const make of [
  systemContext,
  insideTheApp,
  draftFromChat,
  createSendOnce,
  paymentReaches,
  depositBalance,
  remindersFlow,
  morningRun,
  dataAndSnapshot,
  manyFreelancers,
]) {
  const diagram = make();
  writeFileSync(`${out}${diagram.slug}.svg`, diagram.render());
  console.log(`${diagram.slug}.svg`);
}
