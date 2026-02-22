import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "path";
import { mkdirSync } from "fs";

const dbPath = resolve(process.cwd(), "data", "db", "perf-test.db");
mkdirSync(resolve(dbPath, ".."), { recursive: true });

const client = createClient({ url: `file:${dbPath}` });
const db = drizzle(client);

console.log("Running migrations...");
await migrate(db, { migrationsFolder: resolve(__dirname, "migrations") });
console.log("Migrations completed successfully.");

client.close();
