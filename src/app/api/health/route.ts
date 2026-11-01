import { connection } from "next/server";
import { isDemoClock, today, todayInKolkata } from "@/lib/clock";
import { getEnv, isOffline } from "@/lib/env";
import { getAccessToken } from "@/lib/paypal/token";
import { getStore, storageKind } from "@/lib/store";
import type { HealthResponse } from "@/types";
import { ok } from "@/app/api/_lib/respond";

async function checkPayPal(): Promise<HealthResponse["paypal"]> {
  try {
    await getAccessToken();
    return "connected";
  } catch {
    return "error";
  }
}

function checkAi(): HealthResponse["ai"] {
  try {
    // Offline mode drafts from templates, which need no key.
    return isOffline() || getEnv().GEMINI_API_KEY ? "ready" : "missing_key";
  } catch {
    return "missing_key";
  }
}

function checkOffline(): boolean {
  try {
    return isOffline();
  } catch {
    return false;
  }
}

async function checkStorage(): Promise<HealthResponse["storage"]> {
  try {
    const kind = storageKind();
    await getStore().ping();
    return kind;
  } catch {
    return "error";
  }
}

function readClock(): Pick<HealthResponse, "today" | "demoClock"> {
  try {
    return { today: today(), demoClock: isDemoClock() };
  } catch {
    return { today: todayInKolkata(), demoClock: false };
  }
}

export async function GET(): Promise<Response> {
  await connection();
  const [paypal, storage] = await Promise.all([checkPayPal(), checkStorage()]);
  return ok<HealthResponse>({
    paypal,
    ai: checkAi(),
    storage,
    mode: "sandbox",
    offline: checkOffline(),
    ...readClock(),
  });
}
