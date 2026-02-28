import { sqliteTable, text, integer, real, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { scenarios } from "./scenarios";
import { versions } from "./versions";
import { jmxScripts } from "./jmx-scripts";
import { baselines } from "./baselines";

export const testTypes = sqliteTable("test_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // 'load' | 'stress'
  displayName: text("display_name").notNull(),
  description: text("description"),
});

export const testRuns = sqliteTable("test_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),

  // References
  scenarioId: integer("scenario_id").notNull().references(() => scenarios.id),
  testTypeId: integer("test_type_id").notNull().references(() => testTypes.id),
  versionId: integer("version_id").notNull().references(() => versions.id),
  jmxScriptId: integer("jmx_script_id").notNull().references(() => jmxScripts.id),
  baselineId: integer("baseline_id").references((): AnySQLiteColumn => baselines.id),

  // Execution config
  runnerType: text("runner_type").notNull(), // 'local' | 'ssh' | 'jenkins'
  runnerConfig: text("runner_config", { mode: "json" }),

  // Test parameters (actual values used)
  userCount: integer("user_count").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  rampUpSeconds: integer("ramp_up_seconds"),

  // Status tracking
  status: text("status").notNull().default("pending"),
  progress: integer("progress").default(0),
  currentPhase: text("current_phase"),

  // Timestamps
  queuedAt: integer("queued_at", { mode: "timestamp" }),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),

  // Results
  resultFile: text("result_file"),
  jmeterLog: text("jmeter_log"),
  errorLog: text("error_log"),
  exitCode: integer("exit_code"),

  // Summary (denormalized for dashboard)
  totalSamples: integer("total_samples"),
  errorCount: integer("error_count"),
  errorPercent: real("error_percent"),
  averageResponseTime: real("average_response_time"),
  p90ResponseTime: real("p90_response_time"),
  p95ResponseTime: real("p95_response_time"),
  throughput: real("throughput"),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
  createdBy: text("created_by"),
});

export const testStatistics = sqliteTable("test_statistics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  testRunId: integer("test_run_id").notNull().references(() => testRuns.id),

  transactionName: text("transaction_name").notNull(),
  transactionLabel: text("transaction_label"),

  sampleCount: integer("sample_count").notNull(),
  errorCount: integer("error_count").notNull(),
  errorPercent: real("error_percent"),

  // Response times (ms)
  min: integer("min"),
  max: integer("max"),
  mean: integer("mean"),
  median: integer("median"),
  stdDev: real("std_dev"),
  p90: integer("p90"),
  p95: integer("p95"),
  p99: integer("p99"),

  // Throughput
  throughput: real("throughput"),
  receivedKbPerSec: real("received_kb_per_sec"),
  sentKbPerSec: real("sent_kb_per_sec"),

  // Status
  status: text("status"),
  regressionSeverity: text("regression_severity"),

  // Baseline comparison
  baselineP90: integer("baseline_p90"),
  p90ChangePercent: real("p90_change_percent"),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});
