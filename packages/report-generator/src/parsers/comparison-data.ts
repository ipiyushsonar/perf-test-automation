import { getDb, testRuns, testStatistics, versions, scenarios, testTypes, baselines } from "@perf-test/db";
import { eq, inArray } from "drizzle-orm";
import type { TestRunSummary, TransactionStats, ComparisonData, TransactionComparison, VersionComparison } from "../types";
import { parseJMeterCsvWithSummary, createEmptyStats } from "./jmeter-csv";

export async function loadTestRunData(testRunId: number): Promise<TestRunSummary | null> {
  const db = getDb();

  const [testRun] = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.id, testRunId))
    .limit(1);

  if (!testRun) {
    return null;
  }

  const [scenario] = await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.id, testRun.scenarioId))
    .limit(1);

  const [testType] = await db
    .select()
    .from(testTypes)
    .where(eq(testTypes.id, testRun.testTypeId))
    .limit(1);

  const [version] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, testRun.versionId))
    .limit(1);

  const statistics = await db
    .select()
    .from(testStatistics)
    .where(eq(testStatistics.testRunId, testRunId));

  const transactions: TransactionStats[] = statistics.map((s) => ({
    transactionName: s.transactionName,
    sampleCount: s.sampleCount,
    errorCount: s.errorCount,
    errorPercent: s.errorPercent ?? 0,
    min: s.min ?? 0,
    max: s.max ?? 0,
    mean: s.mean ?? 0,
    median: s.median ?? 0,
    stdDev: s.stdDev ?? 0,
    p90: s.p90 ?? 0,
    p95: s.p95 ?? 0,
    p99: s.p99 ?? 0,
    throughput: s.throughput ?? 0,
  }));

  const overall: TransactionStats = {
    transactionName: "Overall",
    sampleCount: testRun.totalSamples ?? 0,
    errorCount: testRun.errorCount ?? 0,
    errorPercent: testRun.errorPercent ?? 0,
    min: 0,
    max: 0,
    mean: Math.round(testRun.averageResponseTime ?? 0),
    median: 0,
    stdDev: 0,
    p90: testRun.p90ResponseTime ?? 0,
    p95: testRun.p95ResponseTime ?? 0,
    p99: 0,
    throughput: testRun.throughput ?? 0,
  };

  return {
    testRunId: testRun.id,
    scenarioName: scenario?.name || "Unknown",
    testTypeName: testType?.name || "Unknown",
    versionId: testRun.versionId,
    version: version?.version || "Unknown",
    startTime: testRun.startedAt || new Date(),
    endTime: testRun.completedAt || new Date(),
    durationMs: testRun.startedAt && testRun.completedAt
      ? testRun.completedAt.getTime() - testRun.startedAt.getTime()
      : 0,
    userCount: testRun.userCount,
    overall,
    transactions,
  };
}

export async function loadMultipleTestRuns(testRunIds: number[]): Promise<TestRunSummary[]> {
  const results: TestRunSummary[] = [];

  for (const id of testRunIds) {
    const data = await loadTestRunData(id);
    if (data) {
      results.push(data);
    }
  }

  return results.sort((a, b) => a.version.localeCompare(b.version));
}

export async function loadBaselineData(baselineId: number): Promise<TestRunSummary | null> {
  const db = getDb();

  const [baseline] = await db
    .select()
    .from(baselines)
    .where(eq(baselines.id, baselineId))
    .limit(1);

  if (!baseline || !baseline.metrics) {
    return null;
  }

  const metrics = baseline.metrics as Array<{
    transactionName: string;
    sampleCount?: number;
    errorCount?: number;
    errorPercent?: number;
    mean?: number;
    p90?: number;
    p95?: number;
    p99?: number;
    throughput?: number;
  }>;

  const transactions: TransactionStats[] = metrics.map((m) => ({
    transactionName: m.transactionName,
    sampleCount: m.sampleCount ?? 0,
    errorCount: m.errorCount ?? 0,
    errorPercent: m.errorPercent ?? 0,
    min: 0,
    max: 0,
    mean: m.mean ?? 0,
    median: 0,
    stdDev: 0,
    p90: m.p90 ?? 0,
    p95: m.p95 ?? 0,
    p99: m.p99 ?? 0,
    throughput: m.throughput ?? 0,
  }));

  const overall = transactions.find((t) => t.transactionName === "Overall") || createEmptyStats("Overall");

  return {
    testRunId: baseline.sourceTestRunId ?? 0,
    scenarioName: "",
    testTypeName: "",
    versionId: baseline.versionId ?? 0,
    version: "Baseline",
    startTime: baseline.createdAt || new Date(),
    endTime: baseline.createdAt || new Date(),
    durationMs: 0,
    userCount: 0,
    overall,
    transactions,
  };
}

export async function buildComparisonData(
  testRunIds: number[],
  baselineId?: number,
  reportType?: "comparison" | "single" | "baseline"
): Promise<ComparisonData> {
  const testRuns = await loadMultipleTestRuns(testRunIds);

  let baseline: TestRunSummary | undefined;
  if (baselineId) {
    const baselineData = await loadBaselineData(baselineId);
    if (baselineData) {
      baseline = baselineData;
    }
  }

  if (reportType === "baseline" && baseline) {
    const transactions: TransactionComparison[] = baseline.transactions.map((tx) => {
      const comparison = createTransactionComparison(tx.transactionName, [{
        versionId: 0,
        version: "Baseline",
        sampleCount: tx.sampleCount,
        errorCount: tx.errorCount,
        errorPercent: tx.errorPercent,
        mean: tx.mean,
        median: tx.median,
        p90: tx.p90,
        p95: tx.p95,
        p99: tx.p99,
        throughput: tx.throughput,
      }]);
      return comparison;
    });

    const overall = createTransactionComparison("Overall", [{
      versionId: 0,
      version: "Baseline",
      sampleCount: baseline.overall.sampleCount,
      errorCount: baseline.overall.errorCount,
      errorPercent: baseline.overall.errorPercent,
      mean: baseline.overall.mean,
      median: baseline.overall.median,
      p90: baseline.overall.p90,
      p95: baseline.overall.p95,
      p99: baseline.overall.p99,
      throughput: baseline.overall.throughput,
    }]);

    return {
      reportType: "baseline",
      testRuns: [baseline],
      transactions: transactions.sort((a, b) => a.transactionName.localeCompare(b.transactionName)),
      overall,
      baseline,
    };
  }

  if (testRuns.length === 0) {
    return {
      reportType: "single",
      testRuns: [],
      transactions: [],
      overall: createTransactionComparison("Overall", []),
    };
  }

  const resolvedReportType = reportType || (testRuns.length === 1 ? "single" : "comparison");

  const allTransactionNames = new Set<string>();
  for (const run of testRuns) {
    for (const tx of run.transactions) {
      allTransactionNames.add(tx.transactionName);
    }
  }

  const transactions: TransactionComparison[] = [];

  for (const name of allTransactionNames) {
    const versions: VersionComparison[] = [];

    for (const run of testRuns) {
      const tx = run.transactions.find((t) => t.transactionName === name);
      if (tx) {
        versions.push({
          versionId: run.versionId,
          version: run.version,
          sampleCount: tx.sampleCount,
          errorCount: tx.errorCount,
          errorPercent: tx.errorPercent,
          mean: tx.mean,
          median: tx.median,
          p90: tx.p90,
          p95: tx.p95,
          p99: tx.p99,
          throughput: tx.throughput,
        });
      }
    }

    const comparison = createTransactionComparison(name, versions);

    if (baseline) {
      const baselineTx = baseline.transactions.find((t) => t.transactionName === name);
      if (baselineTx) {
        comparison.baseline = {
          versionId: 0,
          version: "Baseline",
          sampleCount: baselineTx.sampleCount,
          errorCount: baselineTx.errorCount,
          errorPercent: baselineTx.errorPercent,
          mean: baselineTx.mean,
          median: baselineTx.median,
          p90: baselineTx.p90,
          p95: baselineTx.p95,
          p99: baselineTx.p99,
          throughput: baselineTx.throughput,
        };
      }
    }

    transactions.push(comparison);
  }

  const overallVersions: VersionComparison[] = testRuns.map((run) => ({
    versionId: run.versionId,
    version: run.version,
    sampleCount: run.overall.sampleCount,
    errorCount: run.overall.errorCount,
    errorPercent: run.overall.errorPercent,
    mean: run.overall.mean,
    median: run.overall.median,
    p90: run.overall.p90,
    p95: run.overall.p95,
    p99: run.overall.p99,
    throughput: run.overall.throughput,
  }));

  const overall = createTransactionComparison("Overall", overallVersions);

  if (baseline) {
    overall.baseline = {
      versionId: 0,
      version: "Baseline",
      sampleCount: baseline.overall.sampleCount,
      errorCount: baseline.overall.errorCount,
      errorPercent: baseline.overall.errorPercent,
      mean: baseline.overall.mean,
      median: baseline.overall.median,
      p90: baseline.overall.p90,
      p95: baseline.overall.p95,
      p99: baseline.overall.p99,
      throughput: baseline.overall.throughput,
    };
  }

  return {
    reportType: resolvedReportType,
    testRuns,
    transactions: transactions.sort((a, b) => a.transactionName.localeCompare(b.transactionName)),
    overall,
    baseline,
  };
}

function createTransactionComparison(
  name: string,
  versions: VersionComparison[]
): TransactionComparison {
  return {
    transactionName: name,
    versions,
    baseline: undefined,
    changeFromBaseline: undefined,
    regression: undefined,
  };
}
