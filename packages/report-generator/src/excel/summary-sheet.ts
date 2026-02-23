import ExcelJS from "exceljs";
import type { ExcelReportOptions } from "./workbook";
import { formatDuration, formatNumber, formatPercent, getStatusColor } from "./workbook";
import { createHeaderStyle, createDataStyle, createTitleStyle } from "./styles";

export function createSummarySheet(
  workbook: ExcelJS.Workbook,
  options: ExcelReportOptions
): void {
  const sheet = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const titleStyle = createTitleStyle(workbook);
  const headerStyle = createHeaderStyle(workbook);
  const dataStyle = createDataStyle(workbook);

  sheet.columns = [
    { key: "label", width: 25 },
    { key: "value", width: 20 },
  ];

  sheet.addRow(["Performance Test Report Summary"]).eachCell((cell) => {
    cell.style = titleStyle;
  });
  sheet.mergeCells("A1:B1");

  sheet.addRow([]);

  const summaryData = [
    ["Report Title", options.title],
    ["Generated At", options.generatedAt.toLocaleString()],
    ["Report Type", options.comparison.reportType.toUpperCase()],
    ["", ""],
    ["Overall Status", options.summary.overallStatus.toUpperCase()],
    ["", ""],
    ["Total Transactions", options.summary.totalTransactions.toString()],
    ["Total Samples", options.summary.totalSamples.toLocaleString()],
    ["Test Duration", formatDuration(options.summary.testDuration)],
    ["Average Error Rate", formatPercent(options.summary.averageErrorRate)],
    ["", ""],
    ["Performance Summary", ""],
    ["Improved", options.summary.improvedCount.toString()],
    ["Stable", options.summary.stableCount.toString()],
    ["Degraded", options.summary.degradedCount.toString()],
    ["Critical", options.summary.criticalCount.toString()],
  ];

  for (const [label, value] of summaryData) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).style = headerStyle;
    row.getCell(2).style = dataStyle;

    if (label === "Overall Status") {
      const color = getStatusColor(options.summary.overallStatus);
      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color },
      };
    }
  }

  sheet.addRow([]);

  sheet.addRow(["Threshold Configuration"]).eachCell((cell) => {
    cell.style = headerStyle;
  });
  sheet.mergeCells(`A${sheet.rowCount}:B${sheet.rowCount}`);

  const thresholdData = [
    ["P90 Warning", `${options.thresholds.p90.warning}% increase`],
    ["P90 Critical", `${options.thresholds.p90.critical}% increase`],
    ["P95 Warning", `${options.thresholds.p95.warning}% increase`],
    ["P95 Critical", `${options.thresholds.p95.critical}% increase`],
    ["Error Rate Warning", `${options.thresholds.errorRate.warning}%`],
    ["Error Rate Critical", `${options.thresholds.errorRate.critical}%`],
    ["Throughput Warning", `${options.thresholds.throughput.warning}% decrease`],
    ["Throughput Critical", `${options.thresholds.throughput.critical}% decrease`],
  ];

  for (const [label, value] of thresholdData) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).style = dataStyle;
    row.getCell(2).style = dataStyle;
  }

  sheet.addRow([]);

  sheet.addRow(["Test Runs Included"]).eachCell((cell) => {
    cell.style = headerStyle;
  });
  sheet.mergeCells(`A${sheet.rowCount}:B${sheet.rowCount}`);

  for (const run of options.comparison.testRuns) {
    const row = sheet.addRow([
      `v${run.version}`,
      `${run.scenarioName} - ${run.testTypeName}`,
    ]);
    row.getCell(1).style = dataStyle;
    row.getCell(2).style = dataStyle;
  }

  if (options.comparison.baseline) {
    sheet.addRow(["Baseline", options.comparison.baseline.version]);
  }
}
