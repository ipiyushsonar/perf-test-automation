import type { InfluxDBClient } from "../client";
import type { InfluxDBRow } from "../types";
import { parseQueryResult } from "../parsers/jmeter-schema";

export interface TimeSeriesOptions {
  testName: string;
  transactionName?: string;
  startTime?: Date;
  endTime?: Date;
  lastMinutes?: number;
  intervalSeconds?: number;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  meanResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  throughput: number;
  errorCount: number;
  sampleCount: number;
}

export interface TransactionTimeSeries {
  transactionName: string;
  data: TimeSeriesDataPoint[];
}

export async function getResponseTimeSeries(
  client: InfluxDBClient,
  options: TimeSeriesOptions
): Promise<TransactionTimeSeries[]> {
  const {
    testName,
    transactionName,
    startTime,
    endTime,
    lastMinutes = 5,
    intervalSeconds = 10,
  } = options;

  const interval = `${intervalSeconds}s`;
  const timeCondition = buildTimeCondition(startTime, endTime, lastMinutes);

  const transactionFilter = transactionName
    ? `AND "transaction" = '${escapeInfluxString(transactionName)}'`
    : "";

  const query = `
    SELECT 
      MEAN("rt") AS mean,
      PERCENTILE("rt", 90) AS p90,
      PERCENTILE("rt", 95) AS p95,
      COUNT("rt") AS sampleCount,
      SUM("ec") AS errorCount
    FROM "jmeter"
    WHERE "application" = '${escapeInfluxString(testName)}'
      ${timeCondition}
      ${transactionFilter}
    GROUP BY time(${interval}), "transaction"
    ORDER BY time ASC
  `;

  const result = await client.query(query);
  const rows = parseQueryResult(result);

  return groupTimeSeriesByTransaction(rows);
}

export async function getThroughputSeries(
  client: InfluxDBClient,
  options: TimeSeriesOptions
): Promise<TransactionTimeSeries[]> {
  const {
    testName,
    transactionName,
    startTime,
    endTime,
    lastMinutes = 5,
    intervalSeconds = 10,
  } = options;

  const interval = `${intervalSeconds}s`;
  const timeCondition = buildTimeCondition(startTime, endTime, lastMinutes);

  const transactionFilter = transactionName
    ? `AND "transaction" = '${escapeInfluxString(transactionName)}'`
    : "";

  const query = `
    SELECT 
      SUM("sc") AS throughput,
      COUNT("rt") AS sampleCount
    FROM "jmeter"
    WHERE "application" = '${escapeInfluxString(testName)}'
      ${timeCondition}
      ${transactionFilter}
    GROUP BY time(${interval}), "transaction"
    ORDER BY time ASC
  `;

  const result = await client.query(query);
  const rows = parseQueryResult(result);

  return groupTimeSeriesByTransaction(rows);
}

export async function getErrorRateSeries(
  client: InfluxDBClient,
  options: TimeSeriesOptions
): Promise<TransactionTimeSeries[]> {
  const {
    testName,
    transactionName,
    startTime,
    endTime,
    lastMinutes = 5,
    intervalSeconds = 10,
  } = options;

  const interval = `${intervalSeconds}s`;
  const timeCondition = buildTimeCondition(startTime, endTime, lastMinutes);

  const transactionFilter = transactionName
    ? `AND "transaction" = '${escapeInfluxString(transactionName)}'`
    : "";

  const query = `
    SELECT 
      SUM("ec") AS errorCount,
      COUNT("rt") AS sampleCount,
      (SUM("ec")::float / COUNT("rt")::float) * 100 AS errorPercent
    FROM "jmeter"
    WHERE "application" = '${escapeInfluxString(testName)}'
      ${timeCondition}
      ${transactionFilter}
    GROUP BY time(${interval}), "transaction"
    ORDER BY time ASC
  `;

  const result = await client.query(query);
  const rows = parseQueryResult(result);

  return groupTimeSeriesByTransaction(rows);
}

function groupTimeSeriesByTransaction(rows: InfluxDBRow[]): TransactionTimeSeries[] {
  const grouped = new Map<string, TimeSeriesDataPoint[]>();

  for (const row of rows) {
    const transaction = String(row.transaction || "Unknown");
    const timestamp = new Date(Number(row.time || 0));

    const point: TimeSeriesDataPoint = {
      timestamp,
      meanResponseTime: Number(row.mean || 0),
      p90ResponseTime: Number(row.p90 || 0),
      p95ResponseTime: Number(row.p95 || 0),
      throughput: Number(row.throughput || 0),
      errorCount: Number(row.errorCount || 0),
      sampleCount: Number(row.sampleCount || 0),
    };

    const existing = grouped.get(transaction) || [];
    existing.push(point);
    grouped.set(transaction, existing);
  }

  const result: TransactionTimeSeries[] = [];
  for (const [transactionName, data] of grouped) {
    result.push({ transactionName, data });
  }

  return result;
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
