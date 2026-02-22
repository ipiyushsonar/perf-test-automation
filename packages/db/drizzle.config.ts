import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace("file:", "") || "./data/db/perf-test.db",
  },
} satisfies Config;
