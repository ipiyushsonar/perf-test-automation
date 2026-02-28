import { sqliteTable, text, integer, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { scenarios } from "./scenarios";

export const jmxScripts = sqliteTable("jmx_scripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  checksum: text("checksum"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  scenarioId: integer("scenario_id").references((): AnySQLiteColumn => scenarios.id),
  uploadedBy: text("uploaded_by"),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
