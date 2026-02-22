import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const baselines = sqliteTable("baselines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),

  scenarioId: integer("scenario_id"),
  testTypeId: integer("test_type_id"),
  versionId: integer("version_id"),
  sourceTestRunId: integer("source_test_run_id"),

  // Per-transaction baseline metrics (JSON)
  metrics: text("metrics", { mode: "json" }),

  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
