import ExcelJS from "exceljs";
import type { ComparisonData, TestRunSummary, TransactionComparison, ReportSummary, ThresholdConfig } from "../types";
import { createComparisonSheet } from "./comparison-sheet";
import { createSummarySheet } from "./summary-sheet";
import { createTransactionSheet } from "./transaction-sheet";
import { generateAllCharts } from "./charts";

export interface ExcelReportOptions {
  title: string;
  comparison: ComparisonData;
  summary: ReportSummary;
  thresholds: ThresholdConfig;
  generatedAt: Date;
}

export async function generateExcelReport(
  options: ExcelReportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Perf Test Automation";
  workbook.created = options.generatedAt;
  workbook.properties.date1904 = false;

  createSummarySheet(workbook, options);

  createComparisonSheet(workbook, options);

  createTransactionSheet(workbook, options);

  if (options.comparison.transactions.length > 0) {
    const charts = await generateAllCharts(options.comparison, {
      improvedCount: options.summary.improvedCount,
      stableCount: options.summary.stableCount,
      degradedCount: options.summary.degradedCount,
      criticalCount: options.summary.criticalCount,
    });

    const chartsSheet = workbook.addWorksheet("Charts", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    chartsSheet.columns = [{ key: "placeholder", width: 100 }];

    const titleRow = chartsSheet.addRow(["Performance Charts"]);
    titleRow.height = 30;
    titleRow.getCell(1).font = { size: 16, bold: true };

    chartsSheet.addRow([]);

    const rtImageId = workbook.addImage({
      base64: charts.responseTime.base64,
      extension: "png",
    });

    const rtTitleRow = chartsSheet.addRow(["Response Time Comparison (P90)"]);
    rtTitleRow.getCell(1).font = { size: 12, bold: true };
    chartsSheet.addImage(rtImageId, {
      tl: { col: 0, row: chartsSheet.rowCount },
      ext: { width: charts.responseTime.width, height: charts.responseTime.height },
    });
    for (let i = 0; i < Math.ceil(charts.responseTime.height / 15); i++) {
      chartsSheet.addRow([]);
    }
    chartsSheet.addRow([]);

    const tpImageId = workbook.addImage({
      base64: charts.throughput.base64,
      extension: "png",
    });

    const tpTitleRow = chartsSheet.addRow(["Throughput Comparison"]);
    tpTitleRow.getCell(1).font = { size: 12, bold: true };
    chartsSheet.addImage(tpImageId, {
      tl: { col: 0, row: chartsSheet.rowCount },
      ext: { width: charts.throughput.width, height: charts.throughput.height },
    });
    for (let i = 0; i < Math.ceil(charts.throughput.height / 15); i++) {
      chartsSheet.addRow([]);
    }
    chartsSheet.addRow([]);

    const errImageId = workbook.addImage({
      base64: charts.errorRate.base64,
      extension: "png",
    });

    const errTitleRow = chartsSheet.addRow(["Error Rate Comparison"]);
    errTitleRow.getCell(1).font = { size: 12, bold: true };
    chartsSheet.addImage(errImageId, {
      tl: { col: 0, row: chartsSheet.rowCount },
      ext: { width: charts.errorRate.width, height: charts.errorRate.height },
    });
    for (let i = 0; i < Math.ceil(charts.errorRate.height / 15); i++) {
      chartsSheet.addRow([]);
    }
    chartsSheet.addRow([]);

    const sevImageId = workbook.addImage({
      base64: charts.severityDistribution.base64,
      extension: "png",
    });

    const sevTitleRow = chartsSheet.addRow(["Performance Distribution"]);
    sevTitleRow.getCell(1).font = { size: 12, bold: true };
    chartsSheet.addImage(sevImageId, {
      tl: { col: 0, row: chartsSheet.rowCount },
      ext: { width: charts.severityDistribution.width, height: charts.severityDistribution.height },
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }
  return value.toFixed(decimals);
}

export function formatPercent(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(2)}%`;
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "FFFF0000";
    case "moderate":
    case "degraded":
      return "FFFFA500";
    case "minor":
      return "FFFFFF00";
    case "improved":
      return "FF00FF00";
    default:
      return "FF00FF00";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pass":
      return "FF00FF00";
    case "warning":
      return "FFFFFF00";
    case "fail":
      return "FFFF0000";
    default:
      return "FFFFFFFF";
  }
}
