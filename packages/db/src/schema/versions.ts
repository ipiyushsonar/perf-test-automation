import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const versions = sqliteTable("versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  version: text("version").notNull().unique(), // '14.2.2'
  displayName: text("display_name"),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
