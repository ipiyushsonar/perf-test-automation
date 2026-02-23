import type { QueryResult, InfluxDBRow } from "../types";
import type { AggregateMetric, TimeSeriesPoint, TransactionTimeSeries } from "@perf-test/types";

export interface JMeterMetricRow {
  transactionName: string;
  sampleCount: number;
  errorCount: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
  receivedKbPerSec: number;
  sentKbPerSec: number;
  timestamp?: number;
}

export function parseQueryResult(result: QueryResult): InfluxDBRow[] {
  const rows: InfluxDBRow[] = [];

  for (const resultSet of result.results) {
    if (resultSet.error) {
      console.warn("Query result error:", resultSet.error);
      continue;
    }

    for (const series of resultSet.series || []) {
      const { columns, values, tags } = series;

      for (const valueRow of values || []) {
        const row: InfluxDBRow = {};

        columns.forEach((col, i) => {
          row[col] = valueRow[i];
        });

        if (tags) {
          Object.assign(row, tags);
        }

        rows.push(row);
      }
    }
  }

  return rows;
}

export function parseAggregateMetrics(rows: InfluxDBRow[]): AggregateMetric[] {
  return rows.map((row) => ({
    transactionName: String(row.transaction || row.transactionName || "Overall"),
    sampleCount: Number(row.sampleCount || row.sample_count || 0),
    errorCount: Number(row.errorCount || row.error_count || 0),
    errorPercent: Number(row.errorPercent || row.error_percent || 0),
    min: Number(row.min || 0),
    max: Number(row.max || 0),
    mean: Number(row.mean || 0),
    median: Number(row.median || 0),
    p90: Number(row.p90 || 0),
    p95: Number(row.p95 || 0),
    p99: Number(row.p99 || 0),
    throughput: Number(row.throughput || 0),
  }));
}

export function parseTransactionTimeSeries(
  rows: InfluxDBRow[],
  transactionName: string
): TransactionTimeSeries {
  const responseTime: TimeSeriesPoint[] = [];
  const throughput: TimeSeriesPoint[] = [];
  const errorRate: TimeSeriesPoint[] = [];

  for (const row of rows) {
    const timestamp = new Date(Number(row.time || row.timestamp || 0));

    if (row.mean || row.responseTime) {
      responseTime.push({
        timestamp,
        value: Number(row.mean || row.responseTime || 0),
      });
    }

    if (row.throughput) {
      throughput.push({
        timestamp,
        value: Number(row.throughput),
      });
    }

    if (row.errorPercent !== undefined || row.error_rate !== undefined) {
      errorRate.push({
        timestamp,
        value: Number(row.errorPercent || row.error_rate || 0),
      });
    }
  }

  return {
    transactionName,
    responseTime,
    throughput,
    errorRate,
  };
}

export function parseOverallSummary(rows: InfluxDBRow[]): AggregateMetric {
  if (rows.length === 0) {
    return {
      transactionName: "Overall",
      sampleCount: 0,
      errorCount: 0,
      errorPercent: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      throughput: 0,
    };
  }

  const row = rows[0];
  return {
    transactionName: "Overall",
    sampleCount: Number(row.sampleCount || row.sample_count || 0),
    errorCount: Number(row.errorCount || row.error_count || 0),
    errorPercent: Number(row.errorPercent || row.error_percent || 0),
    min: Number(row.min || 0),
    max: Number(row.max || 0),
    mean: Number(row.mean || 0),
    median: Number(row.median || 0),
    p90: Number(row.p90 || 0),
    p95: Number(row.p95 || 0),
    p99: Number(row.p99 || 0),
    throughput: Number(row.throughput || 0),
  };
}

export function groupRowsByTransaction(rows: InfluxDBRow[]): Map<string, InfluxDBRow[]> {
  const grouped = new Map<string, InfluxDBRow[]>();

  for (const row of rows) {
    const transaction = String(row.transaction || row.transactionName || "Unknown");
    const existing = grouped.get(transaction) || [];
    existing.push(row);
    grouped.set(transaction, existing);
  }

  return grouped;
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}
