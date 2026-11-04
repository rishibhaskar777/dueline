// Draws the animated diagrams in docs/media/architecture/. Plain Node, no packages.
// Run it from the repository root with `npm run diagrams`. It is a documentation tool: CI does
// not run it, and its output is committed, so a diagram changes only when this folder does.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { systemContext } from "./system-context.mjs";
import { insideTheApp } from "./inside-the-app.mjs";
import { draftFromChat } from "./draft-from-chat.mjs";
import { createSendOnce } from "./create-send-once.mjs";
import { paymentReaches } from "./payment-reaches.mjs";
import { depositBalance } from "./deposit-balance.mjs";
import { remindersFlow } from "./reminders.mjs";
import { morningRun } from "./morning-run.mjs";
import { dataAndSnapshot } from "./data-and-snapshot.mjs";
import { manyFreelancers } from "./many-freelancers.mjs";

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
