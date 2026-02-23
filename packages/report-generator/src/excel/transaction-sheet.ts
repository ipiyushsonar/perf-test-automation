import ExcelJS from "exceljs";
import type { TransactionComparison } from "../types";
import type { ExcelReportOptions } from "./workbook";
import { formatNumber, formatPercent } from "./workbook";
import { createHeaderStyle, createDataStyle, createTitleStyle } from "./styles";

export function createTransactionSheet(
  workbook: ExcelJS.Workbook,
  options: ExcelReportOptions
): void {
  const sheet = workbook.addWorksheet("Transactions", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const titleStyle = createTitleStyle(workbook);
  const headerStyle = createHeaderStyle(workbook);
  const dataStyle = createDataStyle(workbook);

  sheet.addRow(["Transaction Details"]).eachCell((cell) => {
    cell.style = titleStyle;
  });
  sheet.mergeCells("A1:K1");

  sheet.columns = [
    { key: "transaction", width: 30 },
    { key: "version", width: 15 },
    { key: "samples", width: 10 },
    { key: "errors", width: 10 },
    { key: "errPct", width: 10 },
    { key: "min", width: 10 },
    { key: "max", width: 10 },
    { key: "mean", width: 10 },
    { key: "median", width: 10 },
    { key: "p90", width: 10 },
    { key: "p95", width: 10 },
    { key: "p99", width: 10 },
    { key: "throughput", width: 12 },
  ];

  const headerRow = [
    "Transaction",
    "Version",
    "Samples",
    "Errors",
    "Err %",
    "Min",
    "Max",
    "Mean",
    "Median",
    "P90",
    "P95",
    "P99",
    "Throughput",
  ];

  sheet.addRow(headerRow).eachCell((cell) => {
    cell.style = headerStyle;
  });

  const separatorRow = sheet.addRow([]);
  sheet.getRow(separatorRow.number).height = 5;

  for (const tx of options.comparison.transactions) {
    for (const version of tx.versions) {
      const row = sheet.addRow([
        tx.transactionName,
        version.version,
        version.sampleCount,
        version.errorCount,
        formatPercent(version.errorPercent),
        0,
        0,
        version.mean || 0,
        version.median || 0,
        version.p90 || 0,
        version.p95 || 0,
        version.p99 || 0,
        formatNumber(version.throughput, 2),
      ]);

      row.eachCell((cell) => {
        cell.style = dataStyle;
      });
    }

    if (tx.baseline) {
      const baselineRow = sheet.addRow([
        tx.transactionName,
        "BASELINE",
        tx.baseline.sampleCount,
        tx.baseline.errorCount,
        formatPercent(tx.baseline.errorPercent),
        "-",
        "-",
        tx.baseline.mean || 0,
        "-",
        tx.baseline.p90 || 0,
        tx.baseline.p95 || 0,
        tx.baseline.p99 || 0,
        formatNumber(tx.baseline.throughput, 2),
      ]);

      baselineRow.eachCell((cell) => {
        cell.style = { ...dataStyle, font: { italic: true } };
      });
    }
  }

  sheet.addRow([]);

  const overallTitleRow = sheet.addRow(["Overall Summary"]);
  overallTitleRow.eachCell((cell) => {
    cell.style = headerStyle;
  });
  sheet.mergeCells(`A${overallTitleRow.number}:M${overallTitleRow.number}`);

  for (const run of options.comparison.testRuns) {
    const row = sheet.addRow([
      "Overall",
      run.version,
      run.overall.sampleCount,
      run.overall.errorCount,
      formatPercent(run.overall.errorPercent),
      run.overall.min || 0,
      run.overall.max || 0,
      run.overall.mean || 0,
      run.overall.median || 0,
      run.overall.p90 || 0,
      run.overall.p95 || 0,
      run.overall.p99 || 0,
      formatNumber(run.overall.throughput, 2),
    ]);

    row.eachCell((cell) => {
      cell.style = { ...dataStyle, font: { bold: true } };
    });
  }
}
