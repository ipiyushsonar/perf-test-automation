import { sqliteTable, text, integer, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { scenarios } from "./scenarios";
import { testTypes, testRuns } from "./test-runs";
import { versions } from "./versions";

export const baselines = sqliteTable("baselines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),

  scenarioId: integer("scenario_id").references(() => scenarios.id),
  testTypeId: integer("test_type_id").references(() => testTypes.id),
  versionId: integer("version_id").references(() => versions.id),
  sourceTestRunId: integer("source_test_run_id").references((): AnySQLiteColumn => testRuns.id),

  // Per-transaction baseline metrics (JSON)
  metrics: text("metrics", { mode: "json" }),

  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
