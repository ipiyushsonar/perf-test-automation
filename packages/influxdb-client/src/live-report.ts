import type { AggregateMetric, LiveReportData, BaselineComparison } from "@perf-test/types";
import { InfluxDBClient, getInfluxClient } from "./client";
import { getTransactionMetrics, getOverallMetrics } from "./queries/transaction-metrics";

export interface LiveReportOptions {
  testName: string;
  testRunId: number;
  baselineMetrics?: Map<string, AggregateMetric>;
  refreshIntervalMs?: number;
  testStartTime?: Date;
}

export interface LiveReportSubscription {
  unsubscribe: () => void;
  getLastData: () => LiveReportData | null;
}

export class LiveReportAggregator {
  private client: InfluxDBClient;
  private testName: string;
  private testRunId: number;
  private baselineMetrics: Map<string, AggregateMetric>;
  private interval: ReturnType<typeof setInterval> | null = null;
  private callbacks: Set<(data: LiveReportData) => void> = new Set();
  private lastData: LiveReportData | null = null;
  private testStartTime: Date;
  private refreshIntervalMs: number;

  constructor(options: LiveReportOptions) {
    this.client = getInfluxClient();
    this.testName = options.testName;
    this.testRunId = options.testRunId;
    this.baselineMetrics = options.baselineMetrics || new Map();
    this.testStartTime = options.testStartTime || new Date();
    this.refreshIntervalMs = options.refreshIntervalMs || 5000;
  }

  async refresh(): Promise<LiveReportData> {
    const [transactions, overall] = await Promise.all([
      getTransactionMetrics(this.client, {
        testName: this.testName,
        lastMinutes: 5,
      }),
      getOverallMetrics(this.client, {
        testName: this.testName,
        lastMinutes: 5,
      }),
    ]);

    const elapsed = Math.floor((Date.now() - this.testStartTime.getTime()) / 1000);

    const baselineComparisons = this.calculateBaselineComparison(transactions);

    const data: LiveReportData = {
      testRunId: this.testRunId,
      timestamp: new Date(),
      elapsed,
      transactions,
      overall,
      baselineComparisons,
    };

    this.lastData = data;
    this.callbacks.forEach((cb) => cb(data));

    return data;
  }

  subscribe(callback: (data: LiveReportData) => void): LiveReportSubscription {
    this.callbacks.add(callback);

    if (this.lastData) {
      callback(this.lastData);
    }

    if (!this.interval) {
      this.interval = setInterval(() => {
        this.refresh().catch((err) => {
          console.error("Live report refresh error:", err);
        });
      }, this.refreshIntervalMs);

      this.refresh().catch((err) => {
        console.error("Initial live report refresh error:", err);
      });
    }

    return {
      unsubscribe: () => {
        this.callbacks.delete(callback);
        if (this.callbacks.size === 0 && this.interval) {
          clearInterval(this.interval);
          this.interval = null;
        }
      },
      getLastData: () => this.lastData,
    };
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.callbacks.clear();
  }

  setBaselineMetrics(metrics: Map<string, AggregateMetric>): void {
    this.baselineMetrics = metrics;
  }

  private calculateBaselineComparison(
    transactions: AggregateMetric[]
  ): BaselineComparison[] | undefined {
    if (this.baselineMetrics.size === 0) {
      return undefined;
    }

    const comparisons: BaselineComparison[] = [];

    for (const tx of transactions) {
      const baseline = this.baselineMetrics.get(tx.transactionName);
      if (!baseline) continue;

      const changePercent =
        baseline.p90 > 0
          ? ((tx.p90 - baseline.p90) / baseline.p90) * 100
          : 0;

      const severity = this.determineSeverity(changePercent);

      comparisons.push({
        transactionName: tx.transactionName,
        currentP90: tx.p90,
        baselineP90: baseline.p90,
        changePercent,
        severity,
      });
    }

    return comparisons.length > 0 ? comparisons : undefined;
  }

  private determineSeverity(
    changePercent: number
  ): "improved" | "stable" | "degraded" | "critical" {
    if (changePercent <= -10) return "improved";
    if (changePercent <= 10) return "stable";
    if (changePercent <= 25) return "degraded";
    return "critical";
  }
}

export function createLiveReportAggregator(
  options: LiveReportOptions
): LiveReportAggregator {
  return new LiveReportAggregator(options);
}
