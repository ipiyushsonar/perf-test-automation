import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { resolve, dirname } from "path";
import { mkdirSync, existsSync } from "fs";

// Find monorepo root by walking up looking for turbo.json
function findMonorepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "turbo.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to cwd
  return process.cwd();
}

// Resolve database path relative to monorepo root
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const root = findMonorepoRoot();
  const dbPath = resolve(root, "data", "db", "perf-test.db");
  // Ensure directory exists
  mkdirSync(resolve(dbPath, ".."), { recursive: true });
  return `file:${dbPath}`;
}

// Singleton connection for the app
let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const url = getDatabaseUrl();
  const client = createClient({ url });

  return drizzle(client, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type AppDatabase = ReturnType<typeof getDb>;

// Re-export everything
export * from "./schema";
export { schema };
