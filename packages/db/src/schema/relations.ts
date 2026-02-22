import { relations } from "drizzle-orm";
import { scenarios } from "./scenarios";
import { testTypes, testRuns, testStatistics } from "./test-runs";
import { versions } from "./versions";
import { jmxScripts } from "./jmx-scripts";
import { baselines } from "./baselines";
import { reports, grafanaSnapshots } from "./reports";

// Scenario relations
export const scenariosRelations = relations(scenarios, ({ one, many }) => ({
  defaultJmxScript: one(jmxScripts, {
    fields: [scenarios.defaultJmxScriptId],
    references: [jmxScripts.id],
  }),
  testRuns: many(testRuns),
  baselines: many(baselines),
}));

// Test Runs relations
export const testRunsRelations = relations(testRuns, ({ one, many }) => ({
  scenario: one(scenarios, {
    fields: [testRuns.scenarioId],
    references: [scenarios.id],
  }),
  testType: one(testTypes, {
    fields: [testRuns.testTypeId],
    references: [testTypes.id],
  }),
  version: one(versions, {
    fields: [testRuns.versionId],
    references: [versions.id],
  }),
  jmxScript: one(jmxScripts, {
    fields: [testRuns.jmxScriptId],
    references: [jmxScripts.id],
  }),
  baseline: one(baselines, {
    fields: [testRuns.baselineId],
    references: [baselines.id],
  }),
  statistics: many(testStatistics),
  grafanaSnapshots: many(grafanaSnapshots),
}));

// Test Statistics relations
export const testStatisticsRelations = relations(testStatistics, ({ one }) => ({
  testRun: one(testRuns, {
    fields: [testStatistics.testRunId],
    references: [testRuns.id],
  }),
}));

// Versions relations
export const versionsRelations = relations(versions, ({ many }) => ({
  testRuns: many(testRuns),
}));

// JMX Scripts relations
export const jmxScriptsRelations = relations(jmxScripts, ({ one }) => ({
  scenario: one(scenarios, {
    fields: [jmxScripts.scenarioId],
    references: [scenarios.id],
  }),
}));

// Baselines relations
export const baselinesRelations = relations(baselines, ({ one }) => ({
  scenario: one(scenarios, {
    fields: [baselines.scenarioId],
    references: [scenarios.id],
  }),
  testType: one(testTypes, {
    fields: [baselines.testTypeId],
    references: [testTypes.id],
  }),
  version: one(versions, {
    fields: [baselines.versionId],
    references: [versions.id],
  }),
  sourceTestRun: one(testRuns, {
    fields: [baselines.sourceTestRunId],
    references: [testRuns.id],
  }),
}));

// Reports relations
export const reportsRelations = relations(reports, ({ one, many }) => ({
  currentVersion: one(versions, {
    fields: [reports.currentVersionId],
    references: [versions.id],
    relationName: "currentVersion",
  }),
  previousVersion: one(versions, {
    fields: [reports.previousVersionId],
    references: [versions.id],
    relationName: "previousVersion",
  }),
  baseline: one(baselines, {
    fields: [reports.baselineId],
    references: [baselines.id],
  }),
  grafanaSnapshots: many(grafanaSnapshots),
}));

// Grafana Snapshots relations
export const grafanaSnapshotsRelations = relations(
  grafanaSnapshots,
  ({ one }) => ({
    report: one(reports, {
      fields: [grafanaSnapshots.reportId],
      references: [reports.id],
    }),
    testRun: one(testRuns, {
      fields: [grafanaSnapshots.testRunId],
      references: [testRuns.id],
    }),
  })
);
