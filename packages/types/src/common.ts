// ============================================
// Version Types
// ============================================

export interface Version {
  id: number;
  version: string;
  displayName: string | null;
  releaseDate: Date | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateVersionInput {
  version: string;
  displayName?: string;
  releaseDate?: Date;
  description?: string;
}

// ============================================
// JMX Script Types
// ============================================

export interface JmxScript {
  id: number;
  name: string;
  description: string | null;
  filePath: string;
  fileSize: number | null;
  checksum: string | null;
  isDefault: boolean;
  scenarioId: number | null;
  uploadedBy: string | null;
  uploadedAt: Date;
}

export interface UploadJmxScriptInput {
  name: string;
  description?: string;
  scenarioId?: number;
  isDefault?: boolean;
}

// ============================================
// Baseline Types
// ============================================

export interface Baseline {
  id: number;
  name: string;
  description: string | null;
  scenarioId: number | null;
  testTypeId: number | null;
  versionId: number | null;
  sourceTestRunId: number | null;
  metrics: BaselineMetric[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface BaselineMetric {
  transactionName: string;
  sampleCount: number;
  errorPercent: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  throughput: number;
}

export interface CreateBaselineInput {
  name: string;
  description?: string;
  scenarioId?: number;
  testTypeId?: number;
  versionId?: number;
  sourceTestRunId?: number;
  metrics?: BaselineMetric[];
  isDefault?: boolean;
}

// ============================================
// Settings Types
// ============================================

export type SettingsCategory =
  | 'grafana'
  | 'influxdb'
  | 'confluence'
  | 'runner'
  | 'general';

export interface Setting {
  id: number;
  category: SettingsCategory;
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: Date;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  activeScenarios: number;
  totalReports: number;
  lastTestRun: TestRunSummary | null;
}

export interface TestRunSummary {
  id: number;
  name: string | null;
  scenarioName: string;
  testTypeName: string;
  versionName: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ConnectionTestResult {
  service: string;
  connected: boolean;
  message: string;
  latency?: number;
}
