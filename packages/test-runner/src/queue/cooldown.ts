import { EventEmitter } from "events";

/**
 * Manages cooldown periods between test executions.
 * Prevents back-to-back test runs that could skew results
 * by allowing the system under test to stabilize.
 */
export class CooldownManager extends EventEmitter {
  private activeTimer: ReturnType<typeof setTimeout> | null = null;
  private cooldownEnd: Date | null = null;
  private defaultCooldownSeconds: number;

  constructor(defaultCooldownSeconds = 900) {
    super();
    this.defaultCooldownSeconds = defaultCooldownSeconds;
  }

  /**
   * Start a cooldown period. Returns a promise that resolves when cooldown is complete.
   * Can be cancelled via `cancel()`.
   */
  async start(durationSeconds?: number): Promise<void> {
    const seconds = durationSeconds ?? this.defaultCooldownSeconds;

    if (seconds <= 0) {
      return;
    }

    this.cooldownEnd = new Date(Date.now() + seconds * 1000);
    this.emit("started", { durationSeconds: seconds, endsAt: this.cooldownEnd });

    return new Promise<void>((resolve) => {
      this.activeTimer = setTimeout(() => {
        this.activeTimer = null;
        this.cooldownEnd = null;
        this.emit("completed");
        resolve();
      }, seconds * 1000);
    });
  }

  /**
   * Cancel the active cooldown period.
   */
  cancel(): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
      this.cooldownEnd = null;
      this.emit("cancelled");
    }
  }

  /**
   * Check if a cooldown is currently active.
   */
  get isActive(): boolean {
    return this.activeTimer !== null;
  }

  /**
   * Get remaining cooldown time in seconds.
   */
  get remainingSeconds(): number {
    if (!this.cooldownEnd) return 0;
    const remaining = (this.cooldownEnd.getTime() - Date.now()) / 1000;
    return Math.max(0, Math.round(remaining));
  }

  /**
   * Get the cooldown end time.
   */
  get endsAt(): Date | null {
    return this.cooldownEnd;
  }

  /**
   * Update the default cooldown duration.
   */
  setDefaultDuration(seconds: number): void {
    this.defaultCooldownSeconds = seconds;
  }

  /**
   * Get the current status.
   */
  getStatus(): CooldownStatus {
    return {
      isActive: this.isActive,
      remainingSeconds: this.remainingSeconds,
      endsAt: this.cooldownEnd,
      defaultDurationSeconds: this.defaultCooldownSeconds,
    };
  }
}

export interface CooldownStatus {
  isActive: boolean;
  remainingSeconds: number;
  endsAt: Date | null;
  defaultDurationSeconds: number;
}
