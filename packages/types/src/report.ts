// ============================================
// Report Types
// ============================================

export type ReportType = 'comparison' | 'single' | 'baseline';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type OverallStatus = 'pass' | 'warning' | 'fail';
export type RegressionSeverity = 'none' | 'minor' | 'moderate' | 'critical';

export interface Report {
  id: number;
  name: string;
  type: ReportType;
  testRunIds: number[];
  currentVersionId: number | null;
  previousVersionId: number | null;
  baselineId: number | null;
  excelFilePath: string | null;
  htmlFilePath: string | null;
  htmlHostedUrl: string | null;
  totalTransactions: number | null;
  improvedCount: number | null;
  degradedCount: number | null;
  criticalCount: number | null;
  overallStatus: OverallStatus | null;
  confluencePublished: boolean;
  confluencePageId: string | null;
  confluenceUrl: string | null;
  autoPublishConfluence: boolean;
  status: ReportStatus;
  createdAt: Date;
}

export interface CreateReportInput {
  name: string;
  type: ReportType;
  testRunIds: number[];
  currentVersionId?: number;
  previousVersionId?: number;
  baselineId?: number;
  autoPublishConfluence?: boolean;
}

export interface TestStatistic {
  id: number;
  testRunId: number;
  transactionName: string;
  transactionLabel: string | null;
  sampleCount: number;
  errorCount: number;
  errorPercent: number | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
  throughput: number | null;
  receivedKbPerSec: number | null;
  sentKbPerSec: number | null;
  status: string | null;
  regressionSeverity: RegressionSeverity | null;
  baselineP90: number | null;
  p90ChangePercent: number | null;
  createdAt: Date;
}

export interface GrafanaSnapshot {
  id: number;
  reportId: number | null;
  testRunId: number | null;
  dashboardUid: string | null;
  dashboardName: string | null;
  panelId: number | null;
  panelTitle: string | null;
  timeFrom: Date | null;
  timeTo: Date | null;
  imagePath: string | null;
  imageSize: number | null;
  createdAt: Date;
}
