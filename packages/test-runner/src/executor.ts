import { EventEmitter } from "events";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { getDb, testRuns, scenarios, jmxScripts, settings } from "@perf-test/db";
import { eq } from "drizzle-orm";
import type { TestConfig, ProgressEvent, RunnerType, LocalRunnerConfig, SshRunnerConfig, JenkinsRunnerConfig } from "@perf-test/types";

import { BaseRunner } from "./runners/base";
import { LocalRunner } from "./runners/local.runner";
import { SshRunner } from "./runners/ssh.runner";
import { JenkinsRunner } from "./runners/jenkins.runner";
import { TestQueue } from "./queue/test-queue";
import { Scheduler } from "./queue/scheduler";
import { CooldownManager } from "./queue/cooldown";
import { ResultParser } from "./jmeter/result-parser";
import { ParameterInjector } from "./jmeter/parameter-injector";
import { ScriptManager } from "./jmeter/script-manager";

/**
 * Main test execution orchestrator.
 * Ties together runners, queue, cooldown, result parsing, and DB updates.
 *
 * Singleton — should be initialized once when the server starts.
 */
export class TestExecutor extends EventEmitter {
  private queue: TestQueue;
  private scheduler: Scheduler;
  private cooldown: CooldownManager;
  private resultParser: ResultParser;
  private parameterInjector: ParameterInjector;
  private scriptManager: ScriptManager;
  private runners: Map<string, BaseRunner> = new Map();
  private dataDir: string;
  private initialized = false;

  constructor(dataDir: string) {
    super();
    this.dataDir = dataDir;
    this.queue = new TestQueue();
    this.cooldown = new CooldownManager();
    this.scheduler = new Scheduler(this.queue, this.cooldown);
    this.resultParser = new ResultParser();
    this.parameterInjector = new ParameterInjector();
    this.scriptManager = new ScriptManager(dataDir);
  }

  /**
   * Initialize the executor: restore queue, configure runners from settings.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Ensure data directories exist
    const dirs = ["results", "logs", "scripts", "temp"];
    for (const dir of dirs) {
      const dirPath = resolve(this.dataDir, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    }

    // Initialize script manager
    await this.scriptManager.init();

    // Configure runners from DB settings
    await this.configureRunners();

    // Restore queue from DB (handles server restarts)
    await this.queue.restore();

    // Set the scheduler's execute callback
    this.scheduler.onExecute(async (testRunId) => {
      await this.executeTest(testRunId);
    });

    // Forward events
    this.queue.on("enqueued", (data) => this.emit("queue:enqueued", data));
    this.queue.on("dequeued", (data) => this.emit("queue:dequeued", data));
    this.queue.on("removed", (data) => this.emit("queue:removed", data));
    this.scheduler.on("testStarting", (data) => this.emit("test:starting", data));
    this.scheduler.on("testCompleted", (data) => this.emit("test:completed", data));
    this.scheduler.on("testFailed", (data) => this.emit("test:failed", data));
    this.cooldown.on("started", (data) => this.emit("cooldown:started", data));
    this.cooldown.on("completed", () => this.emit("cooldown:completed"));
    this.cooldown.on("cancelled", () => this.emit("cooldown:cancelled"));

    // Start the scheduler
    await this.scheduler.start();

    this.initialized = true;
    this.emit("initialized");
  }

  /**
   * Queue a test run for execution.
   */
  async queueTest(testRunId: number, priority = 0): Promise<{ position: number }> {
    await this.ensureInitialized();

    const item = await this.queue.enqueue(testRunId, priority);
    const position = this.queue.getPosition(testRunId);
    return { position };
  }

  /**
   * Cancel a test: either remove from queue or cancel the running test.
   */
  async cancelTest(testRunId: number): Promise<void> {
    await this.ensureInitialized();

    // Try removing from queue first
    const removed = await this.queue.remove(testRunId);
    if (removed) return;

    // If it's the currently running test, cancel via the runner
    const db = getDb();
    const [testRun] = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.id, testRunId))
      .limit(1);

    if (testRun && testRun.status === "running") {
      const runner = this.runners.get(testRun.runnerType);
      if (runner) {
        await runner.cancel(testRunId);
      }

      await db
        .update(testRuns)
        .set({
          status: "cancelled",
          completedAt: new Date(),
        })
        .where(eq(testRuns.id, testRunId));
    }
  }

  /**
   * Get the current status of the executor.
   */
  getStatus() {
    return {
      initialized: this.initialized,
      scheduler: this.scheduler.getStatus(),
      runners: Array.from(this.runners.entries()).map(([type, runner]) => ({
        type,
        runnerType: runner.type,
      })),
    };
  }

  /**
   * Get the test queue.
   */
  getQueue(): TestQueue {
    return this.queue;
  }

  /**
   * Get the cooldown manager.
   */
  getCooldown(): CooldownManager {
    return this.cooldown;
  }

  /**
   * Get the script manager.
   */
  getScriptManager(): ScriptManager {
    return this.scriptManager;
  }

  /**
   * Run a health check on a specific runner.
   */
  async healthCheck(runnerType: RunnerType): Promise<{ ok: boolean; message: string }> {
    const runner = this.runners.get(runnerType);
    if (!runner) {
      return { ok: false, message: `Runner type '${runnerType}' is not configured` };
    }
    return runner.healthCheck();
  }

  /**
   * Stop the executor gracefully.
   */
  async shutdown(): Promise<void> {
    this.scheduler.stop();
    this.cooldown.cancel();
    this.emit("shutdown");
  }

  // ============================
  // Private implementation
  // ============================

  /**
   * Execute a single test run. Called by the scheduler.
   */
  private async executeTest(testRunId: number): Promise<void> {
    const db = getDb();

    // Load test run with references
    const [testRun] = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.id, testRunId))
      .limit(1);

    if (!testRun) {
      throw new Error(`Test run ${testRunId} not found`);
    }

    // Load scenario for cooldown config
    const [scenario] = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, testRun.scenarioId))
      .limit(1);

    // Load script
    const [script] = await db
      .select()
      .from(jmxScripts)
      .where(eq(jmxScripts.id, testRun.jmxScriptId))
      .limit(1);

    if (!script) {
      await this.failTest(testRunId, "JMX script not found");
      return;
    }

    // Get the appropriate runner
    const runner = this.runners.get(testRun.runnerType);
    if (!runner) {
      await this.failTest(testRunId, `Runner type '${testRun.runnerType}' is not configured`);
      return;
    }

    // Generate result/log file paths
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const resultFile = resolve(this.dataDir, "results", `test_${testRunId}_${timestamp}.csv`);
    const logFile = resolve(this.dataDir, "logs", `test_${testRunId}_${timestamp}.log`);

    // Prepare script (inject parameters into a temp copy)
    let preparedScriptPath = script.filePath;
    try {
      const tempDir = resolve(this.dataDir, "temp");
      preparedScriptPath = await this.parameterInjector.injectParameters(
        script.filePath,
        tempDir,
        {
          userCount: testRun.userCount,
          durationSeconds: testRun.durationMinutes * 60,
          rampUpSeconds: testRun.rampUpSeconds ?? 60,
        }
      );
    } catch (err) {
      // Non-fatal — use original script if injection fails
      this.emit("warning", {
        testRunId,
        message: `Parameter injection failed, using original script: ${err}`,
      });
    }

    // Build test config
    const testConfig: TestConfig = {
      testRunId,
      scriptPath: preparedScriptPath,
      resultPath: resultFile,
      logPath: logFile,
      userCount: testRun.userCount,
      durationSeconds: testRun.durationMinutes * 60,
      rampUpSeconds: testRun.rampUpSeconds ?? 60,
      customProperties: (testRun.runnerConfig as Record<string, unknown>)?.customProperties as Record<string, string> | undefined,
    };

    // Update DB: running
    await db
      .update(testRuns)
      .set({
        status: "running",
        startedAt: new Date(),
        resultFile,
        jmeterLog: logFile,
      })
      .where(eq(testRuns.id, testRunId));

    // Execute and process progress events
    try {
      for await (const event of runner.execute(testConfig)) {
        await this.handleProgressEvent(testRunId, event);
      }
    } catch (err) {
      await this.failTest(testRunId, String(err));
      return;
    }

    // Parse results (if result file exists)
    try {
      const summary = await this.resultParser.parse(resultFile);

      // Update DB with summary statistics
      await db
        .update(testRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          progress: 100,
          currentPhase: null,
          totalSamples: summary.totalSamples,
          errorCount: summary.totalErrors,
          errorPercent: summary.errorPercent,
          averageResponseTime: summary.averageResponseTime,
          p90ResponseTime: summary.p90ResponseTime,
          p95ResponseTime: summary.p95ResponseTime,
          throughput: summary.throughput,
        })
        .where(eq(testRuns.id, testRunId));

      // Insert per-transaction statistics
      if (summary.transactions.length > 0) {
        const { testStatistics } = await import("@perf-test/db");
        await db.insert(testStatistics).values(
          summary.transactions.map((tx) => ({
            testRunId,
            transactionName: tx.transactionName,
            sampleCount: tx.sampleCount,
            errorCount: tx.errorCount,
            errorPercent: tx.errorPercent,
            min: tx.min,
            max: tx.max,
            mean: tx.mean,
            median: tx.median,
            stdDev: tx.stdDev,
            p90: tx.p90,
            p95: tx.p95,
            p99: tx.p99,
            throughput: tx.throughput,
          }))
        );
      }
    } catch (err) {
      // Result parsing failure is non-fatal — test still "completed" but stats missing
      await db
        .update(testRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          progress: 100,
          currentPhase: null,
          errorLog: `Result parsing failed: ${err}`,
        })
        .where(eq(testRuns.id, testRunId));
    }

    // Update cooldown duration from scenario config
    if (scenario?.cooldownSeconds) {
      this.cooldown.setDefaultDuration(scenario.cooldownSeconds);
    }
  }

  /**
   * Handle a progress event from a runner.
   */
  private async handleProgressEvent(
    testRunId: number,
    event: ProgressEvent
  ): Promise<void> {
    const db = getDb();

    switch (event.type) {
      case "status":
        await db
          .update(testRuns)
          .set({ status: event.data.status as string })
          .where(eq(testRuns.id, testRunId));
        break;

      case "phase":
        await db
          .update(testRuns)
          .set({ currentPhase: event.data.phase as string })
          .where(eq(testRuns.id, testRunId));
        break;

      case "progress":
        await db
          .update(testRuns)
          .set({ progress: event.data.percent as number })
          .where(eq(testRuns.id, testRunId));
        break;

      case "error":
        await db
          .update(testRuns)
          .set({ errorLog: event.data.message as string })
          .where(eq(testRuns.id, testRunId));
        break;

      case "complete": {
        const exitCode = event.data.exitCode as number;
        if (exitCode !== 0 && event.data.error) {
          await db
            .update(testRuns)
            .set({
              exitCode,
              errorLog: event.data.error as string,
            })
            .where(eq(testRuns.id, testRunId));
        } else {
          await db
            .update(testRuns)
            .set({ exitCode })
            .where(eq(testRuns.id, testRunId));
        }
        break;
      }
    }

    // Forward to external listeners (SSE, etc.)
    this.emit("progress", { testRunId, event });
  }

  /**
   * Mark a test as failed in the DB.
   */
  private async failTest(testRunId: number, error: string): Promise<void> {
    const db = getDb();
    await db
      .update(testRuns)
      .set({
        status: "failed",
        errorLog: error,
        completedAt: new Date(),
      })
      .where(eq(testRuns.id, testRunId));

    this.emit("test:failed", { testRunId, error });
  }

  /**
   * Configure runners from DB settings.
   */
  private async configureRunners(): Promise<void> {
    const db = getDb();
    const allSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.category, "runner"));

    const settingsMap = new Map<string, unknown>();
    for (const s of allSettings) {
      settingsMap.set(s.key, s.value);
    }

    // Always configure local runner
    const localConfig: LocalRunnerConfig = {
      type: "local",
      jmeterPath: (settingsMap.get("jmeter_path") as string) || "/usr/bin/jmeter",
      jmeterHome: (settingsMap.get("jmeter_home") as string) || undefined,
    };
    this.runners.set("local", new LocalRunner(localConfig));

    // Configure SSH runner if settings are present
    const sshHost = settingsMap.get("ssh_host") as string;
    if (sshHost) {
      const sshConfig: SshRunnerConfig = {
        type: "ssh",
        host: sshHost,
        port: (settingsMap.get("ssh_port") as number) || 22,
        username: (settingsMap.get("ssh_username") as string) || "jmeter",
        privateKeyPath: (settingsMap.get("ssh_private_key_path") as string) || undefined,
        jmeterPath: (settingsMap.get("ssh_jmeter_path") as string) || "/usr/bin/jmeter",
        remoteWorkDir: (settingsMap.get("ssh_remote_work_dir") as string) || "/tmp/jmeter",
      };
      this.runners.set("ssh", new SshRunner(sshConfig));
    }

    // Configure Jenkins runner if settings are present
    const jenkinsUrl = settingsMap.get("jenkins_url") as string;
    if (jenkinsUrl) {
      const jenkinsConfig: JenkinsRunnerConfig = {
        type: "jenkins",
        url: jenkinsUrl,
        username: (settingsMap.get("jenkins_username") as string) || "",
        apiToken: (settingsMap.get("jenkins_api_token") as string) || "",
        jobName: (settingsMap.get("jenkins_job_name") as string) || "performance-test",
      };
      this.runners.set("jenkins", new JenkinsRunner(jenkinsConfig));
    }
  }

  /**
   * Ensure the executor is initialized.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}

// ============================
// Singleton instance
// ============================

let _executor: TestExecutor | null = null;

/**
 * Get or create the singleton TestExecutor instance.
 * The dataDir defaults to {monorepoRoot}/data.
 */
export function getExecutor(dataDir?: string): TestExecutor {
  if (!_executor) {
    const dir = dataDir || resolve(process.cwd(), "data");
    _executor = new TestExecutor(dir);
  }
  return _executor;
}
