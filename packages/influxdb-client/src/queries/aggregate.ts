import type { InfluxDBClient } from "../client";
import type { InfluxDBRow } from "../types";
import { parseQueryResult } from "../parsers/jmeter-schema";
import type { AggregateMetric } from "@perf-test/types";

export interface AggregateOptions {
  testName: string;
  startTime?: Date;
  endTime?: Date;
  lastMinutes?: number;
}

export interface FullAggregateReport {
  transactions: AggregateMetric[];
  overall: AggregateMetric;
  testStartTime?: Date;
  testEndTime?: Date;
  totalDuration: number;
}

export async function getFullAggregateReport(
  client: InfluxDBClient,
  options: AggregateOptions
): Promise<FullAggregateReport> {
  const { testName, startTime, endTime, lastMinutes = 60 } = options;

  const timeCondition = buildTimeCondition(startTime, endTime, lastMinutes);

  const transactionQuery = `
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

  const overallQuery = `
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

  const timeRangeQuery = `
    SELECT 
      FIRST("rt") AS firstSample,
      LAST("rt") AS lastSample
    FROM "jmeter"
    WHERE "application" = '${escapeInfluxString(testName)}'
      ${timeCondition}
  `;

  const [transactionResult, overallResult, timeRangeResult] = await Promise.all([
    client.query(transactionQuery),
    client.query(overallQuery),
    client.query(timeRangeQuery),
  ]);

  const transactionRows = parseQueryResult(transactionResult);
  const overallRows = parseQueryResult(overallResult);
  const timeRangeRows = parseQueryResult(timeRangeResult);

  const transactions = transactionRows.map((row) => ({
    transactionName: String(row.transaction || "Unknown"),
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
  }));

  let overall: AggregateMetric = {
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

  if (overallRows.length > 0) {
    const row = overallRows[0];
    overall = {
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

  let testStartTime: Date | undefined;
  let testEndTime: Date | undefined;
  let totalDuration = 0;

  if (timeRangeRows.length > 0) {
    const row = timeRangeRows[0];
    if (row.time) {
      testStartTime = new Date(Number(row.time));
    }
  }

  if (testStartTime && testEndTime) {
    totalDuration = (testEndTime.getTime() - testStartTime.getTime()) / 1000;
  }

  return {
    transactions,
    overall,
    testStartTime,
    testEndTime,
    totalDuration,
  };
}

export async function getActiveTestCount(
  client: InfluxDBClient
): Promise<number> {
  const query = `
    SHOW TAG VALUES FROM "jmeter" WITH KEY = "application"
    WHERE time > now() - 1h
  `;

  const result = await client.query(query);
  const rows = parseQueryResult(result);

  const uniqueTests = new Set(rows.map((row) => row.value).filter(Boolean));
  return uniqueTests.size;
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
