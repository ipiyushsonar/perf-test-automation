import { NextRequest } from "next/server";
import { getDb, testRuns, baselines } from "@perf-test/db";
import { eq } from "drizzle-orm";
import { getExecutor } from "@perf-test/test-runner";
import {
  getInfluxClient,
  getTransactionMetrics,
  getOverallMetrics,
} from "@perf-test/influxdb-client";
import type { AggregateMetric, BaselineComparison } from "@perf-test/types";

export const runtime = "nodejs";

const REFRESH_INTERVAL_MS = 5000;

interface SSEEvent {
  type: string;
  data: unknown;
}

function serializeSSEEvent(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

async function loadBaselineMetrics(baselineId: number): Promise<Map<string, AggregateMetric>> {
  const db = getDb();
  const [baseline] = await db
    .select()
    .from(baselines)
    .where(eq(baselines.id, baselineId))
    .limit(1);

  if (!baseline || !baseline.metrics) {
    return new Map();
  }

  const metricsMap = new Map<string, AggregateMetric>();
  const metrics = baseline.metrics as Array<{
    transactionName: string;
    p90: number;
    p95: number;
    mean: number;
    throughput: number;
  }>;

  for (const m of metrics) {
    metricsMap.set(m.transactionName, {
      transactionName: m.transactionName,
      sampleCount: 0,
      errorCount: 0,
      errorPercent: 0,
      min: 0,
      max: 0,
      mean: m.mean || 0,
      median: 0,
      p90: m.p90 || 0,
      p95: m.p95 || 0,
      p99: 0,
      throughput: m.throughput || 0,
    });
  }

  return metricsMap;
}

function calculateBaselineComparison(
  transactions: AggregateMetric[],
  baselineMetrics: Map<string, AggregateMetric>
): BaselineComparison[] | undefined {
  if (baselineMetrics.size === 0) {
    return undefined;
  }

  const comparisons: BaselineComparison[] = [];

  for (const tx of transactions) {
    const baseline = baselineMetrics.get(tx.transactionName);
    if (!baseline) continue;

    const changePercent =
      baseline.p90 > 0 ? ((tx.p90 - baseline.p90) / baseline.p90) * 100 : 0;

    let severity: "improved" | "stable" | "degraded" | "critical";
    if (changePercent <= -10) severity = "improved";
    else if (changePercent <= 10) severity = "stable";
    else if (changePercent <= 25) severity = "degraded";
    else severity = "critical";

    comparisons.push({
      transactionName: tx.transactionName,
      currentP90: tx.p90,
      baselineP90: baseline.p90,
      changePercent,
      severity,
    });
  }

  return comparisons.length > 0 ? comparisons : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const testRunId = parseInt(id, 10);

  if (isNaN(testRunId)) {
    return new Response("Invalid test run ID", { status: 400 });
  }

  const db = getDb();
  const [testRun] = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.id, testRunId))
    .limit(1);

  if (!testRun) {
    return new Response("Test run not found", { status: 404 });
  }

  const testName = `test_${testRunId}`;

  let baselineMetrics: Map<string, AggregateMetric> = new Map();
  if (testRun.baselineId) {
    try {
      baselineMetrics = await loadBaselineMetrics(testRun.baselineId);
    } catch (error) {
      console.error("Failed to load baseline metrics:", error);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: SSEEvent) => {
        try {
          controller.enqueue(encoder.encode(serializeSSEEvent(event)));
        } catch {
          // Stream closed
        }
      };

      sendEvent({
        type: "connected",
        data: { testRunId, status: testRun.status },
      });

      const influxClient = getInfluxClient();

      let metricsInterval: ReturnType<typeof setInterval> | null = null;

      const fetchMetrics = async () => {
        try {
          const [transactions, overall] = await Promise.all([
            getTransactionMetrics(influxClient, {
              testName,
              lastMinutes: 5,
            }),
            getOverallMetrics(influxClient, {
              testName,
              lastMinutes: 5,
            }),
          ]);

          const baselineComparisons = calculateBaselineComparison(
            transactions,
            baselineMetrics
          );

          const [updatedRun] = await db
            .select({
              status: testRuns.status,
              progress: testRuns.progress,
              currentPhase: testRuns.currentPhase,
              startedAt: testRuns.startedAt,
            })
            .from(testRuns)
            .where(eq(testRuns.id, testRunId))
            .limit(1);

          let elapsed = 0;
          if (updatedRun?.startedAt) {
            elapsed = Math.floor(
              (Date.now() - updatedRun.startedAt.getTime()) / 1000
            );
          }

          sendEvent({
            type: "metric",
            data: {
              testRunId,
              timestamp: new Date().toISOString(),
              elapsed,
              transactions,
              overall,
              baselineComparisons,
              status: updatedRun?.status,
              progress: updatedRun?.progress,
              currentPhase: updatedRun?.currentPhase,
            },
          });

          if (
            updatedRun?.status === "completed" ||
            updatedRun?.status === "failed" ||
            updatedRun?.status === "cancelled"
          ) {
            if (metricsInterval) {
              clearInterval(metricsInterval);
              metricsInterval = null;
            }
            sendEvent({
              type: "complete",
              data: {
                status: updatedRun.status,
                completedAt: new Date().toISOString(),
              },
            });
            controller.close();
          }
        } catch (error) {
          console.error("Failed to fetch metrics:", error);
          sendEvent({
            type: "error",
            data: { message: "Failed to fetch metrics from InfluxDB" },
          });
        }
      };

      const executor = getExecutor();
      const onProgress = (data: { testRunId: number; event: unknown }) => {
        if (data.testRunId !== testRunId) return;

        sendEvent({
          type: "progress",
          data: data.event,
        });
      };

      const onLog = (data: { testRunId: number; message: string; level: string }) => {
        if (data.testRunId !== testRunId) return;

        sendEvent({
          type: "log",
          data: { message: data.message, level: data.level },
        });
      };

      executor.on("progress", onProgress);
      executor.on("log", onLog);

      metricsInterval = setInterval(fetchMetrics, REFRESH_INTERVAL_MS);

      fetchMetrics().catch(console.error);

      const abortHandler = () => {
        if (metricsInterval) {
          clearInterval(metricsInterval);
        }
        executor.off("progress", onProgress);
        executor.off("log", onLog);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      request.signal.addEventListener("abort", abortHandler);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
