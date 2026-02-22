import { createReadStream } from "fs";
import { readFile } from "fs/promises";
import { createInterface } from "readline";

/**
 * Per-transaction aggregate statistics from a JMeter CSV result file.
 */
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

/**
 * Overall summary statistics from a JMeter CSV result file.
 */
export interface ResultSummary {
  totalSamples: number;
  totalErrors: number;
  errorPercent: number;
  averageResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  throughput: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  transactions: TransactionStats[];
}

interface CsvRow {
  timeStamp: number;
  elapsed: number;
  label: string;
  responseCode: string;
  success: boolean;
  bytes: number;
  grpThreads: number;
  allThreads: number;
}

/**
 * Parses JMeter CSV result files and computes per-transaction aggregate statistics.
 */
export class ResultParser {
  /**
   * Parse a JMeter CSV result file and return aggregate statistics.
   */
  async parse(filePath: string): Promise<ResultSummary> {
    const rows = await this.readCsv(filePath);

    if (rows.length === 0) {
      return {
        totalSamples: 0,
        totalErrors: 0,
        errorPercent: 0,
        averageResponseTime: 0,
        p90ResponseTime: 0,
        p95ResponseTime: 0,
        throughput: 0,
        startTime: 0,
        endTime: 0,
        durationMs: 0,
        transactions: [],
      };
    }

    // Group by transaction label
    const groups = new Map<string, CsvRow[]>();
    for (const row of rows) {
      const existing = groups.get(row.label) || [];
      existing.push(row);
      groups.set(row.label, existing);
    }

    // Calculate per-transaction stats
    const transactions: TransactionStats[] = [];
    for (const [label, labelRows] of groups) {
      transactions.push(this.calculateStats(label, labelRows));
    }

    // Sort by name
    transactions.sort((a, b) => a.transactionName.localeCompare(b.transactionName));

    // Calculate overall stats
    const allElapsed = rows.map((r) => r.elapsed);
    const allErrors = rows.filter((r) => !r.success);
    const startTime = Math.min(...rows.map((r) => r.timeStamp));
    const endTime = Math.max(...rows.map((r) => r.timeStamp + r.elapsed));
    const durationMs = endTime - startTime;
    const durationSec = durationMs / 1000;

    return {
      totalSamples: rows.length,
      totalErrors: allErrors.length,
      errorPercent: rows.length > 0 ? (allErrors.length / rows.length) * 100 : 0,
      averageResponseTime: this.mean(allElapsed),
      p90ResponseTime: this.percentile(allElapsed, 90),
      p95ResponseTime: this.percentile(allElapsed, 95),
      throughput: durationSec > 0 ? rows.length / durationSec : 0,
      startTime,
      endTime,
      durationMs,
      transactions,
    };
  }

  /**
   * Read and parse a JMeter CSV file.
   * Expects the standard JMeter CSV format with header row.
   */
  private async readCsv(filePath: string): Promise<CsvRow[]> {
    const rows: CsvRow[] = [];

    const rl = createInterface({
      input: createReadStream(filePath, "utf-8"),
      crlfDelay: Infinity,
    });

    let headers: string[] = [];
    let isFirst = true;

    for await (const line of rl) {
      if (isFirst) {
        headers = this.parseCsvLine(line);
        isFirst = false;
        continue;
      }

      if (!line.trim()) continue;

      const values = this.parseCsvLine(line);
      const record: Record<string, string> = {};
      for (let i = 0; i < headers.length && i < values.length; i++) {
        record[headers[i]] = values[i];
      }

      // Map standard JMeter CSV columns
      const row: CsvRow = {
        timeStamp: parseInt(record["timeStamp"] || "0", 10),
        elapsed: parseInt(record["elapsed"] || "0", 10),
        label: record["label"] || "unknown",
        responseCode: record["responseCode"] || "",
        success: (record["success"] || "").toLowerCase() === "true",
        bytes: parseInt(record["bytes"] || "0", 10),
        grpThreads: parseInt(record["grpThreads"] || "0", 10),
        allThreads: parseInt(record["allThreads"] || "0", 10),
      };

      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse a single CSV line, handling quoted fields.
   */
  private parseCsvLine(line: string): string[] {
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

  /**
   * Calculate per-transaction aggregate statistics
   */
  private calculateStats(label: string, rows: CsvRow[]): TransactionStats {
    const elapsed = rows.map((r) => r.elapsed);
    const errors = rows.filter((r) => !r.success);

    // Duration for throughput calc
    const startTime = Math.min(...rows.map((r) => r.timeStamp));
    const endTime = Math.max(...rows.map((r) => r.timeStamp + r.elapsed));
    const durationSec = (endTime - startTime) / 1000;

    return {
      transactionName: label,
      sampleCount: rows.length,
      errorCount: errors.length,
      errorPercent: rows.length > 0 ? (errors.length / rows.length) * 100 : 0,
      min: Math.min(...elapsed),
      max: Math.max(...elapsed),
      mean: Math.round(this.mean(elapsed)),
      median: Math.round(this.percentile(elapsed, 50)),
      stdDev: Math.round(this.stdDev(elapsed) * 100) / 100,
      p90: Math.round(this.percentile(elapsed, 90)),
      p95: Math.round(this.percentile(elapsed, 95)),
      p99: Math.round(this.percentile(elapsed, 99)),
      throughput:
        durationSec > 0
          ? Math.round((rows.length / durationSec) * 100) / 100
          : 0,
    };
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private stdDev(values: number[]): number {
    if (values.length <= 1) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
}
