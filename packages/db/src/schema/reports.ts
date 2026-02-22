import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'comparison' | 'single' | 'baseline'

  testRunIds: text("test_run_ids", { mode: "json" }),

  currentVersionId: integer("current_version_id"),
  previousVersionId: integer("previous_version_id"),
  baselineId: integer("baseline_id"),

  // Output files
  excelFilePath: text("excel_file_path"),
  htmlFilePath: text("html_file_path"),
  htmlHostedUrl: text("html_hosted_url"),

  // Summary
  totalTransactions: integer("total_transactions"),
  improvedCount: integer("improved_count"),
  degradedCount: integer("degraded_count"),
  criticalCount: integer("critical_count"),
  overallStatus: text("overall_status"),

  // Confluence
  confluencePublished: integer("confluence_published", { mode: "boolean" }).default(false),
  confluencePageId: text("confluence_page_id"),
  confluenceUrl: text("confluence_url"),
  autoPublishConfluence: integer("auto_publish_confluence", { mode: "boolean" }).default(false),

  status: text("status").default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});

export const grafanaSnapshots = sqliteTable("grafana_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: integer("report_id"),
  testRunId: integer("test_run_id"),

  dashboardUid: text("dashboard_uid"),
  dashboardName: text("dashboard_name"),
  panelId: integer("panel_id"),
  panelTitle: text("panel_title"),

  timeFrom: integer("time_from", { mode: "timestamp" }),
  timeTo: integer("time_to", { mode: "timestamp" }),

  imagePath: text("image_path"),
  imageSize: integer("image_size"),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
