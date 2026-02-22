// ============================================
// Scenario Types
// ============================================

export type ScenarioType = 'combined' | 'standalone';

export interface ScenarioConfig {
  /** Thread group names to enable in JMX */
  threadGroups?: string[];
  /** Custom JMeter properties */
  jmeterProperties?: Record<string, string>;
  /** InfluxDB measurement filter */
  influxMeasurement?: string;
}

export interface Scenario {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  testType: ScenarioType;
  loadUserCount: number | null;
  stressUserCount: number | null;
  durationMinutes: number | null;
  rampUpSeconds: number | null;
  cooldownSeconds: number | null;
  defaultJmxScriptId: number | null;
  config: ScenarioConfig | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateScenarioInput {
  name: string;
  displayName: string;
  description?: string;
  testType: ScenarioType;
  loadUserCount?: number;
  stressUserCount?: number;
  durationMinutes?: number;
  rampUpSeconds?: number;
  cooldownSeconds?: number;
  defaultJmxScriptId?: number;
  config?: ScenarioConfig;
}

export interface UpdateScenarioInput extends Partial<CreateScenarioInput> {}
