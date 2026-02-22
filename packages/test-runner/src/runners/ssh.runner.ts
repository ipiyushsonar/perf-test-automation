import type { Client as SshClient, SFTPWrapper } from "ssh2";
import { access, mkdir, readFile } from "fs/promises";
import { createWriteStream, createReadStream } from "fs";
import { resolve, dirname, basename } from "path";
import type { TestConfig, TestResult, ProgressEvent, SshRunnerConfig } from "@perf-test/types";
import { BaseRunner } from "./base";

/**
 * SSH-based JMeter runner — executes JMeter on a remote machine via SSH.
 * Handles file upload (SCP), remote execution, log streaming, and result download.
 */
export class SshRunner extends BaseRunner {
  readonly type = "ssh";
  private activeConnections = new Map<number, SshClient>();
  private config: SshRunnerConfig;

  constructor(config: SshRunnerConfig) {
    super();
    this.config = config;
  }

  /**
   * Execute a JMeter test on a remote machine via SSH.
   */
  async *execute(testConfig: TestConfig): AsyncGenerator<ProgressEvent> {
    const { testRunId, scriptPath, resultPath, logPath, userCount, durationSeconds, rampUpSeconds, customProperties } = testConfig;

    const { Client } = await import("ssh2");
    const conn = new Client();
    this.activeConnections.set(testRunId, conn);

    try {
      // Phase: initializing
      yield this.createEvent("phase", { phase: "initializing", message: "Connecting to remote host via SSH" });
      yield this.createEvent("status", { status: "running" });

      // Connect
      await this.connect(conn);
      yield this.createEvent("log", { message: `Connected to ${this.config.host}:${this.config.port}`, level: "info" });

      // Phase: uploading
      yield this.createEvent("phase", { phase: "uploading", message: "Uploading JMX script to remote host" });

      const remoteScriptPath = `${this.config.remoteWorkDir}/${basename(scriptPath)}`;
      const remoteResultPath = `${this.config.remoteWorkDir}/results/${basename(resultPath)}`;
      const remoteLogPath = `${this.config.remoteWorkDir}/logs/${basename(logPath)}`;

      // Ensure remote directories exist
      await this.execCommand(conn, `mkdir -p ${this.config.remoteWorkDir}/results ${this.config.remoteWorkDir}/logs`);

      // Upload JMX file via SFTP
      await this.uploadFile(conn, scriptPath, remoteScriptPath);
      yield this.createEvent("log", { message: `Uploaded script to ${remoteScriptPath}`, level: "info" });

      // Phase: executing
      yield this.createEvent("phase", { phase: "executing", message: "Running JMeter on remote host" });

      // Build JMeter command
      const jmeterArgs = [
        "-n",
        `-t ${remoteScriptPath}`,
        `-l ${remoteResultPath}`,
        `-j ${remoteLogPath}`,
        `-Jthreads=${userCount}`,
        `-Jduration=${durationSeconds}`,
        `-Jrampup=${rampUpSeconds}`,
      ];

      if (customProperties) {
        for (const [key, value] of Object.entries(customProperties)) {
          jmeterArgs.push(`-J${key}=${value}`);
        }
      }

      const command = `${this.config.jmeterPath} ${jmeterArgs.join(" ")}`;
      yield this.createEvent("log", { message: `Executing: ${command}`, level: "info" });

      const startTime = new Date();

      // Execute JMeter remotely and stream output
      for await (const event of this.execCommandStream(conn, command)) {
        yield event;
      }

      const endTime = new Date();

      // Phase: collecting
      yield this.createEvent("phase", { phase: "collecting", message: "Downloading results from remote host" });

      // Ensure local output directories exist
      await mkdir(dirname(resultPath), { recursive: true });
      await mkdir(dirname(logPath), { recursive: true });

      // Download result file
      let resultFileExists = false;
      try {
        await this.downloadFile(conn, remoteResultPath, resultPath);
        resultFileExists = true;
        yield this.createEvent("log", { message: "Downloaded result CSV", level: "info" });
      } catch (err) {
        yield this.createEvent("log", { message: `Result file not found on remote: ${err}`, level: "warn" });
      }

      // Download log file
      try {
        await this.downloadFile(conn, remoteLogPath, logPath);
        yield this.createEvent("log", { message: "Downloaded JMeter log", level: "info" });
      } catch (err) {
        yield this.createEvent("log", { message: `Log file not found on remote: ${err}`, level: "warn" });
      }

      // Phase: cleanup
      yield this.createEvent("phase", { phase: "cleanup", message: "Cleaning up remote files" });

      try {
        await this.execCommand(conn, `rm -f ${remoteScriptPath} ${remoteResultPath} ${remoteLogPath}`);
      } catch {
        // Non-critical
      }

      yield this.createEvent("complete", {
        exitCode: 0,
        resultFilePath: resultFileExists ? resultPath : null,
        logFilePath: logPath,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
    } catch (err) {
      yield this.createEvent("error", { message: String(err) });
      yield this.createEvent("complete", {
        exitCode: 1,
        error: String(err),
      });
    } finally {
      conn.end();
      this.activeConnections.delete(testRunId);
    }
  }

  /**
   * Cancel a running test by killing the remote JMeter process.
   */
  async cancel(testRunId: number): Promise<void> {
    const conn = this.activeConnections.get(testRunId);
    if (conn) {
      try {
        await this.execCommand(conn, "pkill -f 'jmeter.*-n' || true");
      } catch {
        // Best effort
      }
      conn.end();
      this.activeConnections.delete(testRunId);
    }
  }

  /**
   * Check if the remote host is reachable and JMeter is available.
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const { Client } = await import("ssh2");
      const conn = new Client();
      await this.connect(conn);

      const result = await this.execCommand(conn, `${this.config.jmeterPath} --version 2>&1 || echo "JMeter not found"`);
      conn.end();

      if (result.includes("not found") || result.includes("No such file")) {
        return {
          ok: false,
          message: `SSH connected but JMeter not found at ${this.config.jmeterPath} on ${this.config.host}`,
        };
      }

      return { ok: true, message: `SSH connection OK, JMeter available on ${this.config.host}` };
    } catch (err) {
      return {
        ok: false,
        message: `SSH connection failed to ${this.config.host}:${this.config.port}: ${err}`,
      };
    }
  }

  /**
   * Connect to the remote SSH server.
   */
  private connect(conn: SshClient): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const connectConfig: Record<string, unknown> = {
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.username,
      };

      if (this.config.privateKeyPath) {
        try {
          const keyContent = await readFile(this.config.privateKeyPath);
          connectConfig.privateKey = keyContent;
        } catch (err) {
          reject(new Error(`Cannot read private key: ${err}`));
          return;
        }
      } else if (this.config.password) {
        connectConfig.password = this.config.password;
      }

      conn.on("ready", () => resolve());
      conn.on("error", (err) => reject(err));
      conn.connect(connectConfig as any);
    });
  }

  /**
   * Execute a command on the remote host and return stdout.
   */
  private execCommand(conn: SshClient, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);

        let stdout = "";
        let stderr = "";

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
        stream.on("close", (code: number) => {
          if (code !== 0 && code !== null) {
            reject(new Error(`Command exited with code ${code}: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });
      });
    });
  }

  /**
   * Execute a command and stream output as ProgressEvents.
   */
  private async *execCommandStream(
    conn: SshClient,
    command: string
  ): AsyncGenerator<ProgressEvent> {
    const events: ProgressEvent[] = [];
    let done = false;
    let exitCode = 0;

    const streamPromise = new Promise<void>((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);

        stream.on("data", (data: Buffer) => {
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              events.push(
                this.createEvent("log", { message: line.trim(), level: "info" })
              );
            }
          }
        });

        stream.stderr.on("data", (data: Buffer) => {
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              events.push(
                this.createEvent("log", { message: line.trim(), level: "warn" })
              );
            }
          }
        });

        stream.on("close", (code: number) => {
          exitCode = code ?? 0;
          done = true;
          resolve();
        });
      });
    });

    // Poll for events
    while (!done) {
      while (events.length > 0) {
        yield events.shift()!;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    // Flush remaining
    while (events.length > 0) {
      yield events.shift()!;
    }

    // Don't throw on non-zero exit — JMeter may exit non-zero with warnings
    if (exitCode !== 0) {
      yield this.createEvent("log", {
        message: `Remote JMeter process exited with code ${exitCode}`,
        level: "warn",
      });
    }
  }

  /**
   * Upload a local file to the remote host via SFTP.
   */
  private uploadFile(conn: SshClient, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        const readStream = createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);

        writeStream.on("close", () => {
          sftp.end();
          resolve();
        });
        writeStream.on("error", (err: Error) => {
          sftp.end();
          reject(err);
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * Download a remote file to the local filesystem via SFTP.
   */
  private downloadFile(conn: SshClient, remotePath: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        const readStream = sftp.createReadStream(remotePath);
        const writeStream = createWriteStream(localPath);

        writeStream.on("close", () => {
          sftp.end();
          resolve();
        });
        readStream.on("error", (err: Error) => {
          sftp.end();
          reject(err);
        });

        readStream.pipe(writeStream);
      });
    });
  }
}
