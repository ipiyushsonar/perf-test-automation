import type { InfluxDBRow } from "../types";
import type { AggregateMetric } from "@perf-test/types";
import { parseQueryResult, parseAggregateMetrics } from "../parsers/jmeter-schema";
import type { InfluxDBClient } from "../client";

export interface TransactionMetricsOptions {
  testName: string;
  startTime?: Date;
  endTime?: Date;
  lastMinutes?: number;
}

export async function getTransactionMetrics(
  client: InfluxDBClient,
  options: TransactionMetricsOptions
): Promise<AggregateMetric[]> {
  const { testName, startTime, endTime, lastMinutes = 5 } = options;

  const timeCondition = buildTimeCondition(startTime, endTime, lastMinutes);

  const query = `
    SELECT 
      COUNT("rt") AS sampleCount,
      SUM("ec") AS errorCount,
      (SUM("ec")::float / COUNT("rt")::float) * 100 AS errorPercent,
      MIN("rt") AS min,
      MAX("rt") AS max,
      MEAN("rt") AS mean,
      MEDIAN("rt") AS median,
      PERCENTILE("rt", 90) AS p90,
      PERCENTILE("rt", 95) AS p95,
      PERCENTILE("rt", 99) AS p99,
      SUM("sc") AS throughput
    FROM "jmeter"
    WHERE "application" = '${escapeInfluxString(testName)}'
      ${timeCondition}
    GROUP BY "transaction"
  `;

  const result = await client.query(query);
  const rows = parseQueryResult(result);

  return parseAggregateMetrics(rows);
}

export async function getOverallMetrics(
  client: InfluxDBClient,
  options: TransactionMetricsOptions
): Promise<AggregateMetric> {
  const { testName, startTime, endTime, lastMinutes = 5 } = options;

  const timeCondition = buildTimeCondition(startTime, endTime, lastMinutes);

  const query = `
    SELECT 
      COUNT("rt") AS sampleCount,
      SUM("ec") AS errorCount,
      (SUM("ec")::float / COUNT("rt")::float) * 100 AS errorPercent,
      MIN("rt") AS min,
      MAX("rt") AS max,
      MEAN("rt") AS mean,
      MEDIAN("rt") AS median,
      PERCENTILE("rt", 90) AS p90,
      PERCENTILE("rt", 95) AS p95,
      PERCENTILE("rt", 99) AS p99,
      SUM("sc") AS throughput
    FROM "jmeter"
    WHERE "application" = '${escapeInfluxString(testName)}'
      ${timeCondition}
  `;

  const result = await client.query(query);
  const rows = parseQueryResult(result);

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
    sampleCount: Number(row.sampleCount || 0),
    errorCount: Number(row.errorCount || 0),
    errorPercent: Number(row.errorPercent || 0),
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

export async function getTransactionNames(
  client: InfluxDBClient,
  testName: string
): Promise<string[]> {
  const query = `
    SHOW TAG VALUES FROM "jmeter" WITH KEY = "transaction"
    WHERE "application" = '${escapeInfluxString(testName)}'
  `;

  const result = await client.query(query);
  const rows = parseQueryResult(result);

  return rows.map((row) => String(row.value || "")).filter(Boolean);
}

function buildTimeCondition(
  startTime?: Date,
  endTime?: Date,
  lastMinutes?: number
): string {
  if (startTime && endTime) {
    return `AND time >= ${startTime.getTime()}ms AND time <= ${endTime.getTime()}ms`;
  }

  if (lastMinutes) {
    return `AND time > now() - ${lastMinutes}m`;
  }

  return "";
}

function escapeInfluxString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
