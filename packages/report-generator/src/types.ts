import type { RegressionSeverity, OverallStatus } from "@perf-test/types";

export interface TransactionStats {
  transactionName: string;
  sampleCount: number;
  errorCount: number;
  errorPercent: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
}

export interface TestRunSummary {
  testRunId: number;
  scenarioName: string;
  testTypeName: string;
  versionId: number;
  version: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  userCount: number;
  overall: TransactionStats;
  transactions: TransactionStats[];
}

export interface VersionComparison {
  versionId: number;
  version: string;
  sampleCount: number;
  errorCount: number;
  errorPercent: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
}

export interface TransactionComparison {
  transactionName: string;
  versions: VersionComparison[];
  baseline?: VersionComparison;
  changeFromBaseline?: ChangeMetrics;
  regression?: RegressionResult;
}

export interface ChangeMetrics {
  meanChange: number;
  p90Change: number;
  p95Change: number;
  throughputChange: number;
  errorPercentChange: number;
}

export interface RegressionResult {
  severity: RegressionSeverity;
  p90Change: number;
  p95Change: number;
  errorPercentChange: number;
  throughputChange: number;
  details: string[];
}

export interface ComparisonData {
  reportType: "comparison" | "single" | "baseline";
  testRuns: TestRunSummary[];
  transactions: TransactionComparison[];
  overall: TransactionComparison;
  baseline?: TestRunSummary;
}

export interface ThresholdConfig {
  p90: {
    warning: number;
    critical: number;
  };
  p95: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  throughput: {
    warning: number;
    critical: number;
  };
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  p90: { warning: 10, critical: 25 },
  p95: { warning: 10, critical: 25 },
  errorRate: { warning: 1, critical: 5 },
  throughput: { warning: 10, critical: 25 },
};

export interface GenerateReportInput {
  name: string;
  type: "comparison" | "single" | "baseline";
  testRunIds: number[];
  baselineId?: number;
  includeGrafanaSnapshots?: boolean;
  thresholds?: Partial<ThresholdConfig>;
  outputFormats?: ("excel" | "html")[];
}

export interface ReportSummary {
  totalTransactions: number;
  improvedCount: number;
  stableCount: number;
  degradedCount: number;
  criticalCount: number;
  overallStatus: OverallStatus;
  testDuration: number;
  totalSamples: number;
  averageErrorRate: number;
}

export interface GeneratedReport {
  testRuns: TestRunSummary[];
  comparison: ComparisonData;
  summary: ReportSummary;
  thresholds: ThresholdConfig;
  generatedAt: Date;
}

export interface ExcelReportOutput {
  buffer: Buffer;
  filename: string;
}

export interface HtmlReportOutput {
  content: string;
  filename: string;
}

export interface JMeterCsvRow {
  timeStamp: number;
  elapsed: number;
  label: string;
  responseCode: string;
  responseMessage: string;
  threadName: string;
  dataType: string;
  success: boolean;
  failureMessage: string;
  bytes: number;
  sentBytes: number;
  grpThreads: number;
  allThreads: number;
  URL: string;
  Latency: number;
  IdleTime: number;
  Connect: number;
}
