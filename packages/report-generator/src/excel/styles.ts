import ExcelJS from "exceljs";

export function createTitleStyle(_workbook: ExcelJS.Workbook): Partial<ExcelJS.Style> {
  return {
    font: {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: "FF000000" },
    },
    alignment: {
      horizontal: "center",
      vertical: "middle",
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    },
  };
}

export function createHeaderStyle(_workbook: ExcelJS.Workbook): Partial<ExcelJS.Style> {
  return {
    font: {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    },
    alignment: {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    },
    border: {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    },
  };
}

export function createDataStyle(_workbook: ExcelJS.Workbook): Partial<ExcelJS.Style> {
  return {
    font: {
      name: "Calibri",
      size: 11,
      color: { argb: "FF000000" },
    },
    alignment: {
      horizontal: "center",
      vertical: "middle",
    },
    border: {
      top: { style: "thin", color: { argb: "FFD0D0D0" } },
      left: { style: "thin", color: { argb: "FFD0D0D0" } },
      bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
      right: { style: "thin", color: { argb: "FFD0D0D0" } },
    },
  };
}

export function createHighlightStyle(_workbook: ExcelJS.Workbook): Partial<ExcelJS.Style> {
  return {
    font: {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FF000000" },
    },
    alignment: {
      horizontal: "center",
      vertical: "middle",
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF2CC" },
    },
    border: {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    },
  };
}

export const COLORS = {
  PASS: "FF00B050",
  WARNING: "FFFFC000",
  FAIL: "FFFF0000",
  HEADER: "FF4472C4",
  ALTERNATE_ROW: "FFF2F2F2",
  IMPROVED: "FF92D050",
  DEGRADED: "FFFFC000",
  CRITICAL: "FFFF0000",
  STABLE: "FFB4C6E7",
};
