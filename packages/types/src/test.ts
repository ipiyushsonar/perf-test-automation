// ============================================
// Test Types
// ============================================

export type TestTypeName = 'load' | 'stress';

export type TestStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'cooldown'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TestPhase =
  | 'initializing'
  | 'uploading'
  | 'executing'
  | 'collecting'
  | 'parsing'
  | 'cleanup';

export interface TestType {
  id: number;
  name: TestTypeName;
  displayName: string;
  description: string | null;
}

export interface TestRun {
  id: number;
  name: string | null;
  scenarioId: number;
  testTypeId: number;
  versionId: number;
  jmxScriptId: number;
  baselineId: number | null;
  runnerType: RunnerType;
  runnerConfig: RunnerConfig | null;
  userCount: number;
  durationMinutes: number;
  rampUpSeconds: number | null;
  status: TestStatus;
  progress: number;
  currentPhase: TestPhase | null;
  queuedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  resultFile: string | null;
  jmeterLog: string | null;
  errorLog: string | null;
  exitCode: number | null;
  totalSamples: number | null;
  errorCount: number | null;
  errorPercent: number | null;
  averageResponseTime: number | null;
  p90ResponseTime: number | null;
  p95ResponseTime: number | null;
  throughput: number | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface CreateTestRunInput {
  name?: string;
  scenarioId: number;
  testTypeId: number;
  versionId: number;
  jmxScriptId: number;
  baselineId?: number;
  runnerType: RunnerType;
  runnerConfig?: RunnerConfig;
  userCount: number;
  durationMinutes: number;
  rampUpSeconds?: number;
}

export interface TestRunWithRelations extends TestRun {
  scenario?: { name: string; displayName: string };
  testType?: { name: string; displayName: string };
  version?: { version: string; displayName: string | null };
  jmxScript?: { name: string };
  baseline?: { name: string } | null;
}

// ============================================
// Runner Types
// ============================================

export type RunnerType = 'local' | 'ssh' | 'jenkins';

export interface LocalRunnerConfig {
  type: 'local';
  jmeterPath: string;
  jmeterHome?: string;
}

export interface SshRunnerConfig {
  type: 'ssh';
  host: string;
  port: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  jmeterPath: string;
  remoteWorkDir: string;
}

export interface JenkinsRunnerConfig {
  type: 'jenkins';
  url: string;
  username: string;
  apiToken: string;
  jobName: string;
}

export type RunnerConfig =
  | LocalRunnerConfig
  | SshRunnerConfig
  | JenkinsRunnerConfig;

// ============================================
// Progress Events
// ============================================

export interface ProgressEvent {
  type: 'status' | 'progress' | 'phase' | 'log' | 'error' | 'metric' | 'complete';
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface StatusEvent extends ProgressEvent {
  type: 'status';
  data: { status: TestStatus };
}

export interface PhaseEvent extends ProgressEvent {
  type: 'phase';
  data: { phase: TestPhase; message: string };
}

export interface LogEvent extends ProgressEvent {
  type: 'log';
  data: { message: string; level: 'info' | 'warn' | 'error' };
}

export interface MetricEvent extends ProgressEvent {
  type: 'metric';
  data: {
    transactionName: string;
    sampleCount: number;
    errorCount: number;
    mean: number;
    p90: number;
    p95: number;
    throughput: number;
  };
}
