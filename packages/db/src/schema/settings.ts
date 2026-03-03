import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { scenarios } from "./scenarios";
import { testTypes } from "./test-runs";
import { versions } from "./versions";
import { jmxScripts } from "./jmx-scripts";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(), // 'grafana' | 'influxdb' | 'confluence' | 'runner' | 'general'
  key: text("key").notNull(),
  value: text("value", { mode: "json" }),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
}, (table) => ({
  categoryKeyIdx: uniqueIndex("settings_category_key_idx").on(table.category, table.key),
}));

export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),

  cronExpression: text("cron_expression"),
  nextRunAt: integer("next_run_at", { mode: "timestamp" }),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),

  scenarioId: integer("scenario_id").references(() => scenarios.id),
  testTypeId: integer("test_type_id").references(() => testTypes.id),
  versionId: integer("version_id").references(() => versions.id),
  jmxScriptId: integer("jmx_script_id").references(() => jmxScripts.id),

  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
