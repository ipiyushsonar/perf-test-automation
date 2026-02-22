import type { TestConfig, TestResult, ProgressEvent, TestStatus, TestPhase } from "@perf-test/types";

export abstract class BaseRunner {
  abstract readonly type: string;

  /**
   * Execute a JMeter test and yield progress events
   */
  abstract execute(config: TestConfig): AsyncGenerator<ProgressEvent>;

  /**
   * Cancel a running test
   */
  abstract cancel(testRunId: number): Promise<void>;

  /**
   * Check if the runner is available and properly configured
   */
  abstract healthCheck(): Promise<{ ok: boolean; message: string }>;

  /**
   * Helper to create a progress event
   */
  protected createEvent(
    type: ProgressEvent["type"],
    data: Record<string, unknown>
  ): ProgressEvent {
    return {
      type,
      timestamp: new Date(),
      data,
    };
  }

  /**
   * Generate the result file name based on convention
   * Format: {scenario}_{type}_{version}_{timestamp}.csv
   */
  protected generateResultFileName(
    scenario: string,
    testType: string,
    version: string
  ): string {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const versionFormatted = version.replace(/\./g, "");
    return `${scenario}_${testType}_${versionFormatted}_${ts}.csv`;
  }
}
