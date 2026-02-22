import { spawn, ChildProcess } from "child_process";
import { access, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import type { TestConfig, TestResult, ProgressEvent, TestStatus, TestPhase, LocalRunnerConfig } from "@perf-test/types";
import { BaseRunner } from "./base";

/**
 * Local JMeter runner — executes JMeter via child_process.spawn on the local machine.
 */
export class LocalRunner extends BaseRunner {
  readonly type = "local";
  private runningProcesses = new Map<number, ChildProcess>();
  private config: LocalRunnerConfig;

  constructor(config: LocalRunnerConfig) {
    super();
    this.config = config;
  }

  /**
   * Execute a JMeter test locally and yield progress events.
   */
  async *execute(testConfig: TestConfig): AsyncGenerator<ProgressEvent> {
    const { testRunId, scriptPath, resultPath, logPath, userCount, durationSeconds, rampUpSeconds, customProperties } = testConfig;

    // Phase: initializing
    yield this.createEvent("phase", { phase: "initializing", message: "Preparing local JMeter execution" });
    yield this.createEvent("status", { status: "running" });

    // Ensure output directories exist
    await mkdir(dirname(resultPath), { recursive: true });
    await mkdir(dirname(logPath), { recursive: true });

    // Build JMeter command arguments
    const args = this.buildJmeterArgs(scriptPath, resultPath, logPath, {
      userCount,
      durationSeconds,
      rampUpSeconds,
      customProperties,
    });

    yield this.createEvent("log", {
      message: `Executing: ${this.config.jmeterPath} ${args.join(" ")}`,
      level: "info",
    });

    // Phase: executing
    yield this.createEvent("phase", { phase: "executing", message: "Running JMeter test" });

    const startTime = new Date();
    let exitCode: number | null = null;
    let error: string | undefined;

    try {
      // Yield events from the JMeter process
      for await (const event of this.runJmeterProcess(testRunId, args)) {
        yield event;
      }

      // Process completed — get exit code from stored reference
      const proc = this.runningProcesses.get(testRunId);
      exitCode = proc?.exitCode ?? 0;
    } catch (err) {
      error = String(err);
      exitCode = 1;
      yield this.createEvent("error", { message: error });
    } finally {
      this.runningProcesses.delete(testRunId);
    }

    const endTime = new Date();

    // Phase: collecting
    yield this.createEvent("phase", { phase: "collecting", message: "Collecting results" });

    // Check if result file was created
    let resultFileExists = false;
    try {
      await access(resultPath);
      resultFileExists = true;
    } catch {
      // Result file was not created
    }

    // Emit completion
    yield this.createEvent("complete", {
      exitCode,
      resultFilePath: resultFileExists ? resultPath : null,
      logFilePath: logPath,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      error,
    });
  }

  /**
   * Cancel a running test by killing the JMeter process.
   */
  async cancel(testRunId: number): Promise<void> {
    const proc = this.runningProcesses.get(testRunId);
    if (proc && !proc.killed) {
      proc.kill("SIGTERM");
      // Give it 5 seconds, then force kill
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill("SIGKILL");
        }
      }, 5000);
      this.runningProcesses.delete(testRunId);
    }
  }

  /**
   * Check if JMeter is available locally.
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await access(this.config.jmeterPath);
      return { ok: true, message: `JMeter found at ${this.config.jmeterPath}` };
    } catch {
      return {
        ok: false,
        message: `JMeter not found at ${this.config.jmeterPath}. Please verify the path in settings.`,
      };
    }
  }

  /**
   * Build JMeter CLI arguments for non-GUI mode execution.
   */
  private buildJmeterArgs(
    scriptPath: string,
    resultPath: string,
    logPath: string,
    params: {
      userCount: number;
      durationSeconds: number;
      rampUpSeconds: number;
      customProperties?: Record<string, string>;
    }
  ): string[] {
    const args: string[] = [
      "-n", // Non-GUI mode
      "-t", scriptPath, // Test plan
      "-l", resultPath, // Result file
      "-j", logPath, // JMeter log
      `-Jthreads=${params.userCount}`,
      `-Jduration=${params.durationSeconds}`,
      `-Jrampup=${params.rampUpSeconds}`,
    ];

    // Add custom properties
    if (params.customProperties) {
      for (const [key, value] of Object.entries(params.customProperties)) {
        args.push(`-J${key}=${value}`);
      }
    }

    return args;
  }

  /**
   * Spawn JMeter as a child process and yield log events from stdout/stderr.
   */
  private async *runJmeterProcess(
    testRunId: number,
    args: string[]
  ): AsyncGenerator<ProgressEvent> {
    const jmeterPath = this.config.jmeterPath;

    const env = { ...process.env };
    if (this.config.jmeterHome) {
      env["JMETER_HOME"] = this.config.jmeterHome;
    }

    const proc = spawn(jmeterPath, args, {
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.runningProcesses.set(testRunId, proc);

    // Buffer for partial lines
    let stdoutBuffer = "";
    let stderrBuffer = "";

    // Create a promise that resolves when the process exits
    const exitPromise = new Promise<number>((resolve, reject) => {
      proc.on("close", (code) => resolve(code ?? 1));
      proc.on("error", (err) => reject(err));
    });

    // Queue of events to yield
    const events: ProgressEvent[] = [];
    let done = false;

    proc.stdout?.on("data", (data: Buffer) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) {
          events.push(
            this.createEvent("log", { message: line.trim(), level: "info" })
          );
          // Try to extract progress from JMeter summary lines
          const progress = this.parseJmeterProgress(line);
          if (progress !== null) {
            events.push(
              this.createEvent("progress", { percent: progress })
            );
          }
        }
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderrBuffer += data.toString();
      const lines = stderrBuffer.split("\n");
      stderrBuffer = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) {
          events.push(
            this.createEvent("log", { message: line.trim(), level: "warn" })
          );
        }
      }
    });

    // Poll for events until process exits
    while (!done) {
      // Yield any queued events
      while (events.length > 0) {
        yield events.shift()!;
      }

      // Check if process has finished
      const raceResult = await Promise.race([
        exitPromise.then((code) => ({ type: "exit" as const, code })),
        new Promise<{ type: "tick" }>((resolve) =>
          setTimeout(() => resolve({ type: "tick" }), 1000)
        ),
      ]);

      if (raceResult.type === "exit") {
        done = true;
        // Flush remaining events
        while (events.length > 0) {
          yield events.shift()!;
        }
      }
    }
  }

  /**
   * Try to parse progress info from JMeter log lines.
   * JMeter's Summariser output looks like:
   *   summary +   1234 in 00:01:00 =   20.6/s Avg:   245 Min:    23 Max:  1234 Err:     0 (0.00%)
   */
  private parseJmeterProgress(line: string): number | null {
    // Look for "summary =" lines which indicate completion totals
    const summaryMatch = line.match(/summary\s*=\s*(\d+)/);
    if (summaryMatch) {
      // We can't easily calculate percent without knowing total expected samples
      // Return null for now — progress tracking via InfluxDB is preferred
      return null;
    }
    return null;
  }
}
