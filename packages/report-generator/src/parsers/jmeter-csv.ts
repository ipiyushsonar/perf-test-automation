import { createReadStream } from "fs";
import { readFile, access } from "fs/promises";
import { createInterface } from "readline";
import type { JMeterCsvRow, TransactionStats, TestRunSummary } from "../types";

export async function parseJMeterCsv(filePath: string): Promise<TransactionStats[]> {
  const rows = await readCsvFile(filePath);

  if (rows.length === 0) {
    return [];
  }

  const groups = new Map<string, JMeterCsvRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.label) || [];
    existing.push(row);
    groups.set(row.label, existing);
  }

  const transactions: TransactionStats[] = [];
  for (const [label, labelRows] of groups) {
    transactions.push(calculateTransactionStats(label, labelRows));
  }

  return transactions.sort((a, b) => a.transactionName.localeCompare(b.transactionName));
}

export async function parseJMeterCsvWithSummary(
  filePath: string,
  metadata?: {
    testRunId: number;
    scenarioName: string;
    testTypeName: string;
    versionId: number;
    version: string;
    userCount: number;
  }
): Promise<TestRunSummary> {
  const rows = await readCsvFile(filePath);

  if (rows.length === 0) {
    return {
      testRunId: metadata?.testRunId || 0,
      scenarioName: metadata?.scenarioName || "Unknown",
      testTypeName: metadata?.testTypeName || "Unknown",
      versionId: metadata?.versionId || 0,
      version: metadata?.version || "Unknown",
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      userCount: metadata?.userCount || 0,
      overall: createEmptyStats("Overall"),
      transactions: [],
    };
  }

  const groups = new Map<string, JMeterCsvRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.label) || [];
    existing.push(row);
    groups.set(row.label, existing);
  }

  const transactions: TransactionStats[] = [];
  for (const [label, labelRows] of groups) {
    transactions.push(calculateTransactionStats(label, labelRows));
  }

  transactions.sort((a, b) => a.transactionName.localeCompare(b.transactionName));

  const allElapsed = rows.map((r) => r.elapsed);
  const allErrors = rows.filter((r) => !r.success);
  const startTime = new Date(Math.min(...rows.map((r) => r.timeStamp)));
  const endTime = new Date(Math.max(...rows.map((r) => r.timeStamp + r.elapsed)));
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationSec = durationMs / 1000;

  const overall: TransactionStats = {
    transactionName: "Overall",
    sampleCount: rows.length,
    errorCount: allErrors.length,
    errorPercent: rows.length > 0 ? (allErrors.length / rows.length) * 100 : 0,
    min: allElapsed.length > 0 ? Math.min(...allElapsed) : 0,
    max: allElapsed.length > 0 ? Math.max(...allElapsed) : 0,
    mean: calculateMean(allElapsed),
    median: calculatePercentile(allElapsed, 50),
    stdDev: calculateStdDev(allElapsed),
    p90: calculatePercentile(allElapsed, 90),
    p95: calculatePercentile(allElapsed, 95),
    p99: calculatePercentile(allElapsed, 99),
    throughput: durationSec > 0 ? rows.length / durationSec : 0,
  };

  return {
    testRunId: metadata?.testRunId || 0,
    scenarioName: metadata?.scenarioName || "Unknown",
    testTypeName: metadata?.testTypeName || "Unknown",
    versionId: metadata?.versionId || 0,
    version: metadata?.version || "Unknown",
    startTime,
    endTime,
    durationMs,
    userCount: metadata?.userCount || 0,
    overall,
    transactions,
  };
}

async function readCsvFile(filePath: string): Promise<JMeterCsvRow[]> {
  const rows: JMeterCsvRow[] = [];

  const rl = createInterface({
    input: createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      headers = parseCsvLine(line);
      isFirst = false;
      continue;
    }

    if (!line.trim()) continue;

    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length && i < values.length; i++) {
      record[headers[i]] = values[i];
    }

    const row: JMeterCsvRow = {
      timeStamp: parseInt(record["timeStamp"] || "0", 10),
      elapsed: parseInt(record["elapsed"] || "0", 10),
      label: record["label"] || "unknown",
      responseCode: record["responseCode"] || "",
      responseMessage: record["responseMessage"] || "",
      threadName: record["threadName"] || "",
      dataType: record["dataType"] || "",
      success: (record["success"] || "").toLowerCase() === "true",
      failureMessage: record["failureMessage"] || "",
      bytes: parseInt(record["bytes"] || "0", 10),
      sentBytes: parseInt(record["sentBytes"] || "0", 10),
      grpThreads: parseInt(record["grpThreads"] || "0", 10),
      allThreads: parseInt(record["allThreads"] || "0", 10),
      URL: record["URL"] || "",
      Latency: parseInt(record["Latency"] || "0", 10),
      IdleTime: parseInt(record["IdleTime"] || "0", 10),
      Connect: parseInt(record["Connect"] || "0", 10),
    };

    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function calculateTransactionStats(label: string, rows: JMeterCsvRow[]): TransactionStats {
  const elapsed = rows.map((r) => r.elapsed);
  const errors = rows.filter((r) => !r.success);

  const startTime = Math.min(...rows.map((r) => r.timeStamp));
  const endTime = Math.max(...rows.map((r) => r.timeStamp + r.elapsed));
  const durationSec = (endTime - startTime) / 1000;

  return {
    transactionName: label,
    sampleCount: rows.length,
    errorCount: errors.length,
    errorPercent: rows.length > 0 ? (errors.length / rows.length) * 100 : 0,
    min: elapsed.length > 0 ? Math.min(...elapsed) : 0,
    max: elapsed.length > 0 ? Math.max(...elapsed) : 0,
    mean: Math.round(calculateMean(elapsed)),
    median: Math.round(calculatePercentile(elapsed, 50)),
    stdDev: Math.round(calculateStdDev(elapsed) * 100) / 100,
    p90: Math.round(calculatePercentile(elapsed, 90)),
    p95: Math.round(calculatePercentile(elapsed, 95)),
    p99: Math.round(calculatePercentile(elapsed, 99)),
    throughput: durationSec > 0 ? Math.round((rows.length / durationSec) * 100) / 100 : 0,
  };
}

export function createEmptyStats(name: string): TransactionStats {
  return {
    transactionName: name,
    sampleCount: 0,
    errorCount: 0,
    errorPercent: 0,
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    stdDev: 0,
    p90: 0,
    p95: 0,
    p99: 0,
    throughput: 0,
  };
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculatePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function calculateStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = calculateMean(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(calculateMean(squareDiffs));
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
