import type { ThresholdConfig } from "../types";

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  p90: { warning: 10, critical: 25 },
  p95: { warning: 10, critical: 25 },
  errorRate: { warning: 1, critical: 5 },
  throughput: { warning: 10, critical: 25 },
};

export function mergeThresholds(
  custom?: Partial<ThresholdConfig>
): ThresholdConfig {
  if (!custom) return DEFAULT_THRESHOLDS;

  return {
    p90: { ...DEFAULT_THRESHOLDS.p90, ...custom.p90 },
    p95: { ...DEFAULT_THRESHOLDS.p95, ...custom.p95 },
    errorRate: { ...DEFAULT_THRESHOLDS.errorRate, ...custom.errorRate },
    throughput: { ...DEFAULT_THRESHOLDS.throughput, ...custom.throughput },
  };
}

export function getSeverityLevel(
  value: number,
  thresholds: { warning: number; critical: number },
  isIncreaseBad: boolean = true
): "none" | "warning" | "critical" {
  if (isIncreaseBad) {
    if (value >= thresholds.critical) return "critical";
    if (value >= thresholds.warning) return "warning";
  } else {
    if (value <= -thresholds.critical) return "critical";
    if (value <= -thresholds.warning) return "warning";
  }
  return "none";
}

export function evaluateMetricChange(
  currentValue: number,
  baselineValue: number,
  thresholds: { warning: number; critical: number },
  isIncreaseBad: boolean = true
): {
  changePercent: number;
  severity: "none" | "warning" | "critical";
  status: "improved" | "stable" | "degraded" | "critical";
} {
  const changePercent = baselineValue === 0
    ? (currentValue === 0 ? 0 : 100)
    : ((currentValue - baselineValue) / baselineValue) * 100;

  const severity = getSeverityLevel(changePercent, thresholds, isIncreaseBad);

  let status: "improved" | "stable" | "degraded" | "critical";
  if (isIncreaseBad) {
    if (changePercent <= -10) status = "improved";
    else if (changePercent <= thresholds.warning) status = "stable";
    else if (changePercent < thresholds.critical) status = "degraded";
    else status = "critical";
  } else {
    if (changePercent >= 10) status = "improved";
    else if (changePercent >= -thresholds.warning) status = "stable";
    else if (changePercent > -thresholds.critical) status = "degraded";
    else status = "critical";
  }

  return { changePercent, severity, status };
}
