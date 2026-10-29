import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ConfigError, getEnv } from "@/lib/env";
import { createSqlClient } from "@/lib/store/postgres-store";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "store", "migrations");

async function migrate(url: string): Promise<void> {
  const sql = createSqlClient(url);
  try {
    const [{ exists }] = await sql<{ exists: boolean }[]>`
      select to_regclass('schema_migrations') is not null as exists`;
    const applied = new Set<string>();
    if (exists) {
      const rows = await sql<{ name: string }[]>`select name from schema_migrations`;
      rows.forEach((row) => applied.add(row.name));
    }

    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipped ${file} (already applied)`);
        continue;
      }
      const statements = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(statements);
        await tx`insert into schema_migrations (name) values (${file})`;
      });
      console.log(`Applied ${file}`);
    }
  } finally {
    await sql.end();
  }
}

async function main(): Promise<void> {
  let url: string | undefined;
  try {
    url = getEnv().DATABASE_URL;
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
  if (!url) {
    console.error("DATABASE_URL is not set. Add the Neon pooled connection string to .env.local.");
    process.exit(1);
  }
  await migrate(url);
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
