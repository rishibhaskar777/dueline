import "server-only";
import { getEnv } from "@/lib/env";
import { createMemoryStore } from "./memory-store";
import { createPostgresStore, createSqlClient } from "./postgres-store";
import type { Store } from "./store";

let instance: Store | undefined;

export function storageKind(): "postgres" | "memory" {
  return getEnv().DATABASE_URL ? "postgres" : "memory";
}

export function getStore(): Store {
  if (!instance) {
    const { DATABASE_URL } = getEnv();
    instance = DATABASE_URL
      ? createPostgresStore(createSqlClient(DATABASE_URL))
      : createMemoryStore();
  }
  return instance;
}
