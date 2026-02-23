import type { TransactionStats, ChangeMetrics, RegressionResult, ThresholdConfig } from "../types";
import { DEFAULT_THRESHOLDS } from "../types";

export function calculateChangePercent(current: number, baseline: number): number {
  if (baseline === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - baseline) / baseline) * 100;
}

export function calculateChangeMetrics(
  current: TransactionStats,
  baseline: TransactionStats
): ChangeMetrics {
  return {
    meanChange: calculateChangePercent(current.mean, baseline.mean),
    p90Change: calculateChangePercent(current.p90, baseline.p90),
    p95Change: calculateChangePercent(current.p95, baseline.p95),
    throughputChange: calculateChangePercent(current.throughput, baseline.throughput) * -1,
    errorPercentChange: current.errorPercent - baseline.errorPercent,
  };
}

export function detectRegression(
  current: TransactionStats,
  baseline: TransactionStats,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): RegressionResult {
  const changes = calculateChangeMetrics(current, baseline);
  const details: string[] = [];

  let severity: "none" | "minor" | "moderate" | "critical" = "none";

  if (changes.p90Change >= thresholds.p90.critical) {
    details.push(`P90 increased by ${changes.p90Change.toFixed(1)}% (critical threshold: ${thresholds.p90.critical}%)`);
    severity = "critical";
  } else if (changes.p90Change >= thresholds.p90.warning) {
    details.push(`P90 increased by ${changes.p90Change.toFixed(1)}% (warning threshold: ${thresholds.p90.warning}%)`);
    if (severity === "none") severity = "moderate";
  }

  if (changes.p95Change >= thresholds.p95.critical) {
    details.push(`P95 increased by ${changes.p95Change.toFixed(1)}% (critical threshold: ${thresholds.p95.critical}%)`);
    severity = "critical";
  } else if (changes.p95Change >= thresholds.p95.warning) {
    details.push(`P95 increased by ${changes.p95Change.toFixed(1)}% (warning threshold: ${thresholds.p95.warning}%)`);
    if (severity !== "critical") severity = "moderate";
  }

  if (changes.errorPercentChange >= thresholds.errorRate.critical) {
    details.push(`Error rate increased by ${changes.errorPercentChange.toFixed(2)}% (critical threshold: ${thresholds.errorRate.critical}%)`);
    severity = "critical";
  } else if (changes.errorPercentChange >= thresholds.errorRate.warning) {
    details.push(`Error rate increased by ${changes.errorPercentChange.toFixed(2)}% (warning threshold: ${thresholds.errorRate.warning}%)`);
    if (severity !== "critical") severity = "moderate";
  }

  if (changes.throughputChange >= thresholds.throughput.critical) {
    details.push(`Throughput decreased by ${changes.throughputChange.toFixed(1)}% (critical threshold: ${thresholds.throughput.critical}%)`);
    severity = "critical";
  } else if (changes.throughputChange >= thresholds.throughput.warning) {
    details.push(`Throughput decreased by ${changes.throughputChange.toFixed(1)}% (warning threshold: ${thresholds.throughput.warning}%)`);
    if (severity !== "critical") severity = "moderate";
  }

  if (changes.p90Change > 5 || changes.p95Change > 5) {
    if (severity === "none") severity = "minor";
    if (!details.some((d) => d.includes("P90") || d.includes("P95"))) {
      details.push(`Minor response time degradation detected`);
    }
  }

  return {
    severity,
    p90Change: changes.p90Change,
    p95Change: changes.p95Change,
    errorPercentChange: changes.errorPercentChange,
    throughputChange: changes.throughputChange,
    details: details.length > 0 ? details : ["No significant regression detected"],
  };
}

export function aggregateTransactions(
  transactionsList: TransactionStats[][]
): TransactionStats[] {
  const aggregated = new Map<string, TransactionStats[]>();

  for (const transactions of transactionsList) {
    for (const tx of transactions) {
      const existing = aggregated.get(tx.transactionName) || [];
      existing.push(tx);
      aggregated.set(tx.transactionName, existing);
    }
  }

  const result: TransactionStats[] = [];

  for (const [name, stats] of aggregated) {
    const allSamples = stats.flatMap((s) => Array(s.sampleCount).fill(s.mean));

    result.push({
      transactionName: name,
      sampleCount: stats.reduce((sum, s) => sum + s.sampleCount, 0),
      errorCount: stats.reduce((sum, s) => sum + s.errorCount, 0),
      errorPercent: calculateAverage(stats.map((s) => s.errorPercent)),
      min: Math.min(...stats.map((s) => s.min)),
      max: Math.max(...stats.map((s) => s.max)),
      mean: Math.round(calculateAverage(stats.map((s) => s.mean))),
      median: Math.round(calculateAverage(stats.map((s) => s.median))),
      stdDev: calculateStdDev(stats.map((s) => s.stdDev)),
      p90: Math.round(calculateAverage(stats.map((s) => s.p90))),
      p95: Math.round(calculateAverage(stats.map((s) => s.p95))),
      p99: Math.round(calculateAverage(stats.map((s) => s.p99))),
      throughput: calculateAverage(stats.map((s) => s.throughput)),
    });
  }

  return result.sort((a, b) => a.transactionName.localeCompare(b.transactionName));
}

export function compareVersionMetrics(
  current: TransactionStats,
  previous: TransactionStats
): {
  improved: boolean;
  changePercent: number;
  description: string;
} {
  const change = calculateChangePercent(current.p90, previous.p90);

  if (change < -10) {
    return {
      improved: true,
      changePercent: change,
      description: `Improved by ${Math.abs(change).toFixed(1)}%`,
    };
  } else if (change > 10) {
    return {
      improved: false,
      changePercent: change,
      description: `Degraded by ${change.toFixed(1)}%`,
    };
  }

  return {
    improved: false,
    changePercent: change,
    description: `Stable (${change >= 0 ? "+" : ""}${change.toFixed(1)}%)`,
  };
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = calculateAverage(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(calculateAverage(squareDiffs));
}
