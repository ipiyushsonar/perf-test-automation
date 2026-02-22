import { mkdir } from "fs/promises";
import { dirname } from "path";
import type { TestConfig, TestResult, ProgressEvent, JenkinsRunnerConfig } from "@perf-test/types";
import { BaseRunner } from "./base";

interface JenkinsBuildInfo {
  number: number;
  url: string;
  result: string | null;
  building: boolean;
  timestamp: number;
  duration: number;
}

/**
 * Jenkins-based JMeter runner — triggers a Jenkins job and monitors it via REST API.
 */
export class JenkinsRunner extends BaseRunner {
  readonly type = "jenkins";
  private activeBuildIds = new Map<number, { jobUrl: string; buildNumber: number }>();
  private config: JenkinsRunnerConfig;

  constructor(config: JenkinsRunnerConfig) {
    super();
    this.config = config;
  }

  /**
   * Trigger a Jenkins job and monitor progress.
   */
  async *execute(testConfig: TestConfig): AsyncGenerator<ProgressEvent> {
    const { testRunId, scriptPath, resultPath, logPath, userCount, durationSeconds, rampUpSeconds, customProperties } = testConfig;

    try {
      // Phase: initializing
      yield this.createEvent("phase", { phase: "initializing", message: "Triggering Jenkins job" });
      yield this.createEvent("status", { status: "running" });

      const jobUrl = `${this.config.url}/job/${encodeURIComponent(this.config.jobName)}`;

      // Build parameters
      const params: Record<string, string> = {
        SCRIPT_PATH: scriptPath,
        USER_COUNT: String(userCount),
        DURATION_SECONDS: String(durationSeconds),
        RAMP_UP_SECONDS: String(rampUpSeconds),
        ...customProperties,
      };

      // Trigger the build
      const queueItemUrl = await this.triggerBuild(jobUrl, params);
      yield this.createEvent("log", { message: `Build queued: ${queueItemUrl}`, level: "info" });

      // Wait for the build to start and get build number
      yield this.createEvent("phase", { phase: "executing", message: "Waiting for Jenkins build to start" });
      const buildNumber = await this.waitForBuildStart(queueItemUrl);
      const buildUrl = `${jobUrl}/${buildNumber}`;

      this.activeBuildIds.set(testRunId, { jobUrl, buildNumber });
      yield this.createEvent("log", { message: `Build #${buildNumber} started: ${buildUrl}`, level: "info" });

      const startTime = new Date();

      // Monitor the build until completion
      let lastLogOffset = 0;
      while (true) {
        // Fetch console output
        const { text, hasMore, offset } = await this.getConsoleOutput(buildUrl, lastLogOffset);
        if (text.trim()) {
          const lines = text.split("\n").filter((l) => l.trim());
          for (const line of lines) {
            yield this.createEvent("log", { message: line, level: "info" });
          }
        }
        lastLogOffset = offset;

        // Check build status
        const buildInfo = await this.getBuildInfo(buildUrl);
        if (!buildInfo.building) {
          // Build finished
          const endTime = new Date();

          yield this.createEvent("log", {
            message: `Build #${buildNumber} finished with result: ${buildInfo.result}`,
            level: buildInfo.result === "SUCCESS" ? "info" : "warn",
          });

          // Phase: collecting
          yield this.createEvent("phase", { phase: "collecting", message: "Fetching build artifacts" });

          // Try to download result artifacts
          let resultFileExists = false;
          try {
            await mkdir(dirname(resultPath), { recursive: true });
            await this.downloadArtifact(buildUrl, "results.csv", resultPath);
            resultFileExists = true;
            yield this.createEvent("log", { message: "Downloaded result CSV artifact", level: "info" });
          } catch {
            yield this.createEvent("log", { message: "No result CSV artifact found", level: "warn" });
          }

          yield this.createEvent("complete", {
            exitCode: buildInfo.result === "SUCCESS" ? 0 : 1,
            resultFilePath: resultFileExists ? resultPath : null,
            logFilePath: null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            jenkinsUrl: buildUrl,
            buildNumber,
            buildResult: buildInfo.result,
          });

          break;
        }

        // Poll every 5 seconds
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (err) {
      yield this.createEvent("error", { message: String(err) });
      yield this.createEvent("complete", {
        exitCode: 1,
        error: String(err),
      });
    } finally {
      this.activeBuildIds.delete(testRunId);
    }
  }

  /**
   * Cancel a running build by aborting it in Jenkins.
   */
  async cancel(testRunId: number): Promise<void> {
    const buildInfo = this.activeBuildIds.get(testRunId);
    if (buildInfo) {
      const stopUrl = `${buildInfo.jobUrl}/${buildInfo.buildNumber}/stop`;
      await this.jenkinsRequest(stopUrl, { method: "POST" });
      this.activeBuildIds.delete(testRunId);
    }
  }

  /**
   * Check if Jenkins is reachable and the job exists.
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const jobUrl = `${this.config.url}/job/${encodeURIComponent(this.config.jobName)}/api/json`;
      const response = await this.jenkinsRequest(jobUrl);
      const data = await response.json() as { name: string };

      return {
        ok: true,
        message: `Jenkins connected. Job "${data.name}" found.`,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Jenkins health check failed: ${err}`,
      };
    }
  }

  /**
   * Trigger a parameterized Jenkins build.
   */
  private async triggerBuild(
    jobUrl: string,
    params: Record<string, string>
  ): Promise<string> {
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      formData.append(key, value);
    }

    const triggerUrl = `${jobUrl}/buildWithParameters`;
    const response = await this.jenkinsRequest(triggerUrl, {
      method: "POST",
      body: formData.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    // Jenkins returns a 201 with Location header pointing to queue item
    const location = response.headers.get("Location");
    if (!location) {
      // Fallback: try to find the build via the job API
      throw new Error("Jenkins did not return queue item location");
    }

    return location;
  }

  /**
   * Wait for a queued build to start and return the build number.
   */
  private async waitForBuildStart(queueItemUrl: string): Promise<number> {
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const response = await this.jenkinsRequest(`${queueItemUrl}api/json`);
        const data = await response.json() as { executable?: { number: number } };

        if (data.executable?.number) {
          return data.executable.number;
        }
      } catch {
        // Queue item may not be available yet
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    throw new Error("Timed out waiting for Jenkins build to start");
  }

  /**
   * Get build information from Jenkins.
   */
  private async getBuildInfo(buildUrl: string): Promise<JenkinsBuildInfo> {
    const response = await this.jenkinsRequest(`${buildUrl}/api/json`);
    return response.json() as Promise<JenkinsBuildInfo>;
  }

  /**
   * Get console output with progressive fetching.
   */
  private async getConsoleOutput(
    buildUrl: string,
    offset: number
  ): Promise<{ text: string; hasMore: boolean; offset: number }> {
    const response = await this.jenkinsRequest(
      `${buildUrl}/logText/progressiveText?start=${offset}`
    );
    const text = await response.text();
    const newOffset = parseInt(
      response.headers.get("X-Text-Size") || String(offset),
      10
    );
    const hasMore = response.headers.get("X-More-Data") === "true";

    return { text, hasMore, offset: newOffset };
  }

  /**
   * Download a build artifact from Jenkins.
   */
  private async downloadArtifact(
    buildUrl: string,
    artifactName: string,
    localPath: string
  ): Promise<void> {
    const response = await this.jenkinsRequest(
      `${buildUrl}/artifact/${artifactName}`
    );

    if (!response.ok) {
      throw new Error(`Artifact not found: ${artifactName}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const { writeFile } = await import("fs/promises");
    await writeFile(localPath, buffer);
  }

  /**
   * Make an authenticated request to Jenkins.
   */
  private async jenkinsRequest(
    url: string,
    options: RequestInit & { headers?: Record<string, string> } = {}
  ): Promise<Response> {
    const authHeader =
      "Basic " +
      Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString(
        "base64"
      );

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: authHeader,
        ...options.headers,
      },
    });

    if (!response.ok && response.status !== 201 && response.status !== 302) {
      throw new Error(`Jenkins API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}
