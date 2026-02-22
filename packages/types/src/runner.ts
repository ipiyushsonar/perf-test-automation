// ============================================
// Runner Configuration Types
// ============================================

export interface TestConfig {
  testRunId: number;
  scriptPath: string;
  resultPath: string;
  logPath: string;
  userCount: number;
  durationSeconds: number;
  rampUpSeconds: number;
  customProperties?: Record<string, string>;
}

export interface TestResult {
  exitCode: number;
  resultFilePath: string;
  logFilePath: string;
  startTime: Date;
  endTime: Date;
  error?: string;
}

export interface RunnerStatus {
  isRunning: boolean;
  currentTestId: number | null;
  queueLength: number;
  lastError: string | null;
}
