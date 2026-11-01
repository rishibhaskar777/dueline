import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { OFFLINE_DEMO_PASSWORD } from "@/lib/env";

// Starts the dev server with no accounts: a simulated PayPal, template drafts and saved rates.
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

console.info(
  `Dueline offline demo: open http://localhost:3000 and use the password "${OFFLINE_DEMO_PASSWORD}".`,
);

const server = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  // The password is fixed so the line printed above is always right, whatever .env.local holds.
  env: { ...process.env, DUELINE_OFFLINE: "true", DEMO_PASSWORD: OFFLINE_DEMO_PASSWORD },
});

server.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}
