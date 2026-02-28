import { sqliteTable, text, integer, real, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { jmxScripts } from "./jmx-scripts";

export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  testType: text("test_type").notNull(), // 'combined' | 'standalone'

  // Default test parameters
  loadUserCount: integer("load_user_count"),
  stressUserCount: integer("stress_user_count"),
  durationMinutes: integer("duration_minutes").default(60),
  rampUpSeconds: integer("ramp_up_seconds").default(60),
  cooldownSeconds: integer("cooldown_seconds").default(900), // 15 min

  // JMX script reference
  defaultJmxScriptId: integer("default_jmx_script_id").references((): AnySQLiteColumn => jmxScripts.id),

  // Configuration (JSON)
  config: text("config", { mode: "json" }),

  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
