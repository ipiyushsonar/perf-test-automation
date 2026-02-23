import { getDb, reports, testRuns, baselines } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { buildComparisonData, loadTestRunData } from "./parsers";
import { detectRegression, calculateChangeMetrics } from "./statistics";
import { mergeThresholds } from "./thresholds";
import { generateExcelReport } from "./excel";
import type {
  GenerateReportInput,
  GeneratedReport,
  ComparisonData,
  ReportSummary,
  ThresholdConfig,
  TransactionComparison,
} from "./types";

export async function generateReport(
  input: GenerateReportInput
): Promise<GeneratedReport> {
  const thresholds = mergeThresholds(input.thresholds);

  let baselineId = input.baselineId;

  if (!baselineId && input.testRunIds.length > 0) {
    baselineId = await findDefaultBaseline(input.testRunIds[0]);
  }

  const comparison = await buildComparisonData(input.testRunIds, baselineId, input.type);

  for (const tx of comparison.transactions) {
    if (tx.baseline) {
      const latestVersion = tx.versions[tx.versions.length - 1];
      const currentStats = {
        transactionName: tx.transactionName,
        sampleCount: latestVersion.sampleCount,
        errorCount: latestVersion.errorCount,
        errorPercent: latestVersion.errorPercent,
        min: 0,
        max: 0,
        mean: latestVersion.mean,
        median: latestVersion.median,
        stdDev: 0,
        p90: latestVersion.p90,
        p95: latestVersion.p95,
        p99: latestVersion.p99,
        throughput: latestVersion.throughput,
      };

      const baselineStats = {
        transactionName: tx.transactionName,
        sampleCount: tx.baseline.sampleCount,
        errorCount: tx.baseline.errorCount,
        errorPercent: tx.baseline.errorPercent,
        min: 0,
        max: 0,
        mean: tx.baseline.mean,
        median: tx.baseline.median,
        stdDev: 0,
        p90: tx.baseline.p90,
        p95: tx.baseline.p95,
        p99: tx.baseline.p99,
        throughput: tx.baseline.throughput,
      };

      tx.regression = detectRegression(currentStats, baselineStats, thresholds);
      tx.changeFromBaseline = calculateChangeMetrics(currentStats, baselineStats);
    }
  }

  if (comparison.overall.baseline) {
    const latestOverall = comparison.testRuns[comparison.testRuns.length - 1].overall;
    const baselineOverall = comparison.baseline!.overall;

    comparison.overall.regression = detectRegression(latestOverall, baselineOverall, thresholds);
    comparison.overall.changeFromBaseline = calculateChangeMetrics(latestOverall, baselineOverall);
  }

  const summary = calculateSummary(comparison);

  return {
    testRuns: comparison.testRuns,
    comparison,
    summary,
    thresholds,
    generatedAt: new Date(),
  };
}

export async function generateAndSaveReport(
  input: GenerateReportInput & { outputFormats?: ("excel" | "html")[] }
): Promise<{
  reportId: number;
  excelBuffer?: Buffer;
  htmlContent?: string;
  excelFilePath?: string;
  htmlFilePath?: string;
  summary: ReportSummary;
}> {
  const generated = await generateReport(input);

  const db = getDb();

  const [report] = await db
    .insert(reports)
    .values({
      name: input.name,
      type: input.type,
      testRunIds: input.testRunIds,
      baselineId: input.baselineId,
      totalTransactions: generated.summary.totalTransactions,
      improvedCount: generated.summary.improvedCount,
      degradedCount: generated.summary.degradedCount,
      criticalCount: generated.summary.criticalCount,
      overallStatus: generated.summary.overallStatus,
      status: "generating",
    })
    .returning();

  const outputFormats = input.outputFormats || ["excel", "html"];
  let excelBuffer: Buffer | undefined;
  let htmlContent: string | undefined;
  let excelFilePath: string | undefined;
  let htmlFilePath: string | undefined;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeName = input.name.replace(/[^a-zA-Z0-9]/g, "_");
  const dataDir = process.env.DATA_DIR || "./data";

  const excelDir = join(dataDir, "reports", "excel");
  const htmlDir = join(dataDir, "reports", "html");

  if (!existsSync(excelDir)) {
    mkdirSync(excelDir, { recursive: true });
  }
  if (!existsSync(htmlDir)) {
    mkdirSync(htmlDir, { recursive: true });
  }

  if (outputFormats.includes("excel")) {
    excelBuffer = await generateExcelReport({
      title: input.name,
      comparison: generated.comparison,
      summary: generated.summary,
      thresholds: generated.thresholds,
      generatedAt: generated.generatedAt,
    });

    const excelFilename = `${safeName}_${report.id}_${timestamp}.xlsx`;
    excelFilePath = join(excelDir, excelFilename);
    writeFileSync(excelFilePath, excelBuffer);
  }

  if (outputFormats.includes("html")) {
    htmlContent = generateHtmlReport({
      title: input.name,
      comparison: generated.comparison,
      summary: generated.summary,
      thresholds: generated.thresholds,
      generatedAt: generated.generatedAt,
    });

    const htmlFilename = `${safeName}_${report.id}_${timestamp}.html`;
    htmlFilePath = join(htmlDir, htmlFilename);
    writeFileSync(htmlFilePath, htmlContent);
  }

  await db
    .update(reports)
    .set({
      status: "completed",
      excelFilePath,
      htmlFilePath,
    })
    .where(eq(reports.id, report.id));

  return {
    reportId: report.id,
    excelBuffer,
    htmlContent,
    excelFilePath,
    htmlFilePath,
    summary: generated.summary,
  };
}

export function generateHtmlReport(options: {
  title: string;
  comparison: ComparisonData;
  summary: ReportSummary;
  thresholds: ThresholdConfig;
  generatedAt: Date;
}): string {
  const { title, comparison, summary, thresholds, generatedAt } = options;

  const styles = getHtmlStyles();
  const summarySection = getSummarySection(summary);
  const comparisonSection = getComparisonSection(comparison);
  const thresholdSection = getThresholdSection(thresholds);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">Performance Test Report</p>
      <p class="meta">Generated: ${generatedAt.toLocaleString()}</p>
    </header>
    ${summarySection}
    ${comparisonSection}
    ${thresholdSection}
    <footer class="footer">
      <p>Generated by Perf Test Automation</p>
    </footer>
  </div>
</body>
</html>`;
}

function getHtmlStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; }
    .header h1 { font-size: 2rem; margin-bottom: 10px; }
    .header .subtitle { font-size: 1.1rem; opacity: 0.9; }
    .header .meta { font-size: 0.9rem; opacity: 0.7; margin-top: 10px; }
    .section { background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); }
    .section h2 { font-size: 1.4rem; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #eee; color: #333; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card .label { display: block; font-size: 0.85rem; color: #666; margin-bottom: 8px; }
    .summary-card .value { font-size: 1.8rem; font-weight: 600; color: #333; }
    .summary-card .value.status-pass { color: #22c55e; }
    .summary-card .value.status-warning { color: #f59e0b; }
    .summary-card .value.status-fail { color: #ef4444; }
    .breakdown-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
    .breakdown-item { text-align: center; padding: 20px; border-radius: 8px; background: #f8f9fa; }
    .breakdown-item.improved { border-left: 4px solid #22c55e; }
    .breakdown-item.stable { border-left: 4px solid #3b82f6; }
    .breakdown-item.degraded { border-left: 4px solid #f59e0b; }
    .breakdown-item.critical { border-left: 4px solid #ef4444; }
    .breakdown-item .count { display: block; font-size: 2rem; font-weight: 600; margin-bottom: 5px; }
    .breakdown-item .label { font-size: 0.9rem; color: #666; }
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .data-table th, .data-table td { padding: 12px 15px; text-align: center; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 600; color: #555; white-space: nowrap; }
    .data-table tbody tr:hover { background: #f8f9fa; }
    .data-table .transaction-name { text-align: left; font-weight: 500; }
    .data-table .error { color: #ef4444; font-weight: 500; }
    .data-table .improved { color: #22c55e; }
    .data-table .degraded { color: #ef4444; }
    .severity-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .severity-badge.severity-none { background: #e5e7eb; color: #4b5563; }
    .severity-badge.severity-minor { background: #fef3c7; color: #92400e; }
    .severity-badge.severity-moderate { background: #fed7aa; color: #9a3412; }
    .severity-badge.severity-critical { background: #fecaca; color: #991b1b; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9rem; }
    @media (max-width: 768px) { .breakdown-grid { grid-template-columns: repeat(2, 1fr); } }
  `;
}

function getSummarySection(summary: ReportSummary): string {
  return `
    <section class="section">
      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <span class="label">Overall Status</span>
          <span class="value status-${summary.overallStatus}">${summary.overallStatus.toUpperCase()}</span>
        </div>
        <div class="summary-card">
          <span class="label">Total Transactions</span>
          <span class="value">${summary.totalTransactions}</span>
        </div>
        <div class="summary-card">
          <span class="label">Total Samples</span>
          <span class="value">${summary.totalSamples.toLocaleString()}</span>
        </div>
        <div class="summary-card">
          <span class="label">Average Error Rate</span>
          <span class="value">${summary.averageErrorRate.toFixed(2)}%</span>
        </div>
      </div>
      <div class="breakdown">
        <h3>Performance Breakdown</h3>
        <div class="breakdown-grid">
          <div class="breakdown-item improved">
            <span class="count">${summary.improvedCount}</span>
            <span class="label">Improved</span>
          </div>
          <div class="breakdown-item stable">
            <span class="count">${summary.stableCount}</span>
            <span class="label">Stable</span>
          </div>
          <div class="breakdown-item degraded">
            <span class="count">${summary.degradedCount}</span>
            <span class="label">Degraded</span>
          </div>
          <div class="breakdown-item critical">
            <span class="count">${summary.criticalCount}</span>
            <span class="label">Critical</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function getComparisonSection(comparison: ComparisonData): string {
  const headerCells = comparison.testRuns.map(run => 
    `<th colspan="5">v${escapeHtml(run.version)}</th>`
  ).join('');
  
  const subHeaderCells = comparison.testRuns.map(() => 
    `<th>Samples</th><th>P90</th><th>P95</th><th>Mean</th><th>Err%</th>`
  ).join('');

  const rows = comparison.transactions.map(tx => {
    const cells = tx.versions.map(v => 
      `<td>${v.sampleCount.toLocaleString()}</td><td>${v.p90}</td><td>${v.p95}</td><td>${v.mean}</td><td>${v.errorPercent.toFixed(2)}%</td>`
    ).join('');

    let baselineCells = '';
    if (comparison.baseline && tx.baseline) {
      const latestVersion = tx.versions[tx.versions.length - 1];
      const changePercent = tx.baseline.p90 > 0 
        ? ((latestVersion.p90 - tx.baseline.p90) / tx.baseline.p90) * 100 
        : 0;
      const severity = tx.regression?.severity || 'none';
      baselineCells = `<td>${tx.baseline.p90}</td><td>${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%</td><td><span class="severity-badge severity-${severity}">${severity.toUpperCase()}</span></td>`;
    }

    return `<tr><td class="transaction-name">${escapeHtml(tx.transactionName)}</td>${cells}${baselineCells}</tr>`;
  }).join('');

  const baselineHeaders = comparison.baseline 
    ? '<th>Baseline P90</th><th>Change</th><th>Status</th>' 
    : '';

  return `
    <section class="section">
      <h2>Version Comparison</h2>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Transaction</th>${headerCells}${baselineHeaders}</tr>
            <tr><th></th>${subHeaderCells}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function getThresholdSection(thresholds: ThresholdConfig): string {
  return `
    <section class="section">
      <h2>Threshold Configuration</h2>
      <table class="data-table">
        <thead>
          <tr><th>Metric</th><th>Warning Threshold</th><th>Critical Threshold</th></tr>
        </thead>
        <tbody>
          <tr><td>P90 Response Time</td><td>${thresholds.p90.warning}% increase</td><td>${thresholds.p90.critical}% increase</td></tr>
          <tr><td>P95 Response Time</td><td>${thresholds.p95.warning}% increase</td><td>${thresholds.p95.critical}% increase</td></tr>
          <tr><td>Error Rate</td><td>${thresholds.errorRate.warning}%</td><td>${thresholds.errorRate.critical}%</td></tr>
          <tr><td>Throughput</td><td>${thresholds.throughput.warning}% decrease</td><td>${thresholds.throughput.critical}% decrease</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function calculateSummary(comparison: ComparisonData): ReportSummary {
  let improvedCount = 0;
  let stableCount = 0;
  let degradedCount = 0;
  let criticalCount = 0;

  for (const tx of comparison.transactions) {
    if (tx.regression) {
      switch (tx.regression.severity) {
        case "none":
          if (tx.changeFromBaseline && tx.changeFromBaseline.p90Change < -5) {
            improvedCount++;
          } else {
            stableCount++;
          }
          break;
        case "minor":
          degradedCount++;
          break;
        case "moderate":
          degradedCount++;
          break;
        case "critical":
          criticalCount++;
          break;
      }
    } else {
      stableCount++;
    }
  }

  let overallStatus: "pass" | "warning" | "fail" = "pass";
  if (criticalCount > 0) {
    overallStatus = "fail";
  } else if (degradedCount > 0) {
    overallStatus = "warning";
  }

  const totalSamples = comparison.testRuns.reduce(
    (sum, run) => sum + run.overall.sampleCount,
    0
  );

  const averageErrorRate =
    comparison.testRuns.reduce((sum, run) => sum + run.overall.errorPercent, 0) /
    (comparison.testRuns.length || 1);

  const testDuration = comparison.testRuns.reduce(
    (max, run) => Math.max(max, run.durationMs),
    0
  );

  return {
    totalTransactions: comparison.transactions.length,
    improvedCount,
    stableCount,
    degradedCount,
    criticalCount,
    overallStatus,
    testDuration,
    totalSamples,
    averageErrorRate,
  };
}

async function findDefaultBaseline(testRunId: number): Promise<number | undefined> {
  const db = getDb();

  const [testRun] = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.id, testRunId))
    .limit(1);

  if (!testRun) return undefined;

  const [defaultBaseline] = await db
    .select()
    .from(baselines)
    .where(eq(baselines.isDefault, true))
    .limit(1);

  return defaultBaseline?.id;
}

export { generateExcelReport } from "./excel";
export { buildComparisonData, loadTestRunData } from "./parsers";
export { detectRegression, calculateChangeMetrics } from "./statistics";
export { mergeThresholds, evaluateMetricChange } from "./thresholds";
