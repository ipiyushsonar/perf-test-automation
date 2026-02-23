import ExcelJS from "exceljs";
import type { ExcelReportOptions } from "./workbook";
import { formatNumber, formatPercent, getSeverityColor } from "./workbook";
import { createHeaderStyle, createDataStyle, createTitleStyle } from "./styles";

export function createComparisonSheet(
  workbook: ExcelJS.Workbook,
  options: ExcelReportOptions
): void {
  const sheet = workbook.addWorksheet("Comparison", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const titleStyle = createTitleStyle(workbook);
  const headerStyle = createHeaderStyle(workbook);
  const dataStyle = createDataStyle(workbook);

  sheet.addRow(["Version Comparison Report"]).eachCell((cell) => {
    cell.style = titleStyle;
  });

  const versionCount = options.comparison.testRuns.length;
  const hasBaseline = !!options.comparison.baseline;

  const columns = [
    { key: "transaction", width: 30 },
  ];

  for (const run of options.comparison.testRuns) {
    columns.push(
      { key: `${run.versionId}_samples`, width: 10 },
      { key: `${run.versionId}_p90`, width: 12 },
      { key: `${run.versionId}_p95`, width: 12 },
      { key: `${run.versionId}_mean`, width: 12 },
      { key: `${run.versionId}_err`, width: 10 }
    );
  }

  if (hasBaseline) {
    columns.push(
      { key: "baseline_p90", width: 12 },
      { key: "baseline_change", width: 12 },
      { key: "severity", width: 10 }
    );
  }

  sheet.columns = columns;

  const headerRow = ["Transaction"];
  for (const run of options.comparison.testRuns) {
    headerRow.push(
      `v${run.version} Samples`,
      `v${run.version} P90`,
      `v${run.version} P95`,
      `v${run.version} Mean`,
      `v${run.version} Err%`
    );
  }

  if (hasBaseline) {
    headerRow.push("Baseline P90", "Change %", "Status");
  }

  sheet.addRow(headerRow).eachCell((cell) => {
    cell.style = headerStyle;
  });

  const separatorRow = sheet.addRow([]);
  sheet.getRow(separatorRow.number).height = 5;

  for (const tx of options.comparison.transactions) {
    const row: (string | number)[] = [tx.transactionName];

    for (const version of tx.versions) {
      row.push(
        version.sampleCount,
        version.p90,
        version.p95,
        version.mean,
        formatPercent(version.errorPercent)
      );
    }

    if (hasBaseline && tx.baseline) {
      const changePercent = tx.baseline.p90 > 0
        ? ((tx.versions[tx.versions.length - 1].p90 - tx.baseline.p90) / tx.baseline.p90) * 100
        : 0;

      row.push(
        tx.baseline.p90,
        `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`
      );

      if (tx.regression) {
        row.push(tx.regression.severity.toUpperCase());
      } else {
        row.push("N/A");
      }
    }

    const dataRow = sheet.addRow(row);
    dataRow.eachCell((cell, colNumber) => {
      cell.style = dataStyle;

      if (hasBaseline && colNumber === columns.length) {
        const severity = tx.regression?.severity || "none";
        const color = getSeverityColor(severity);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
      }
    });
  }

  const overallRow: (string | number)[] = ["OVERALL"];
  for (const run of options.comparison.testRuns) {
    overallRow.push(
      run.overall.sampleCount,
      run.overall.p90,
      run.overall.p95,
      run.overall.mean,
      formatPercent(run.overall.errorPercent)
    );
  }

  if (hasBaseline && options.comparison.overall.baseline) {
    const baselineP90 = options.comparison.overall.baseline.p90;
    const currentP90 = options.comparison.testRuns[options.comparison.testRuns.length - 1].overall.p90;
    const changePercent = baselineP90 > 0
      ? ((currentP90 - baselineP90) / baselineP90) * 100
      : 0;

    overallRow.push(
      baselineP90,
      `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
      options.summary.overallStatus.toUpperCase()
    );
  }

  const finalRow = sheet.addRow(overallRow);
  finalRow.eachCell((cell) => {
    cell.style = { ...dataStyle, font: { bold: true } };
  });
}
