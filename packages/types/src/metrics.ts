// ============================================
// Metrics Types (InfluxDB / Live Reporting)
// ============================================

export interface TransactionMetric {
  transactionName: string;
  timestamp: Date;
  sampleCount: number;
  errorCount: number;
  errorPercent: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
  receivedBytesPerSec: number;
  sentBytesPerSec: number;
}

export interface AggregateMetric {
  transactionName: string;
  sampleCount: number;
  errorCount: number;
  errorPercent: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
}

export interface LiveReportData {
  testRunId: number;
  timestamp: Date;
  elapsed: number; // seconds since test start
  transactions: AggregateMetric[];
  overall: AggregateMetric;
  baseline?: BaselineComparison;
}

export interface BaselineComparison {
  transactionName: string;
  currentP90: number;
  baselineP90: number;
  changePercent: number;
  severity: 'improved' | 'stable' | 'degraded' | 'critical';
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface TransactionTimeSeries {
  transactionName: string;
  responseTime: TimeSeriesPoint[];
  throughput: TimeSeriesPoint[];
  errorRate: TimeSeriesPoint[];
}
