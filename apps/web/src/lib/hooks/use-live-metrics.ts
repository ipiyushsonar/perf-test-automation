"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AggregateMetric, BaselineComparison, TestStatus, TestPhase } from "@perf-test/types";

interface LiveMetricEvent {
  type: "metric";
  data: {
    testRunId: number;
    timestamp: string;
    elapsed: number;
    transactions: AggregateMetric[];
    overall: AggregateMetric;
    baselineComparisons?: BaselineComparison[];
    status: TestStatus;
    progress: number;
    currentPhase: TestPhase | null;
  };
}

interface LogEvent {
  type: "log";
  data: {
    message: string;
    level: "info" | "warn" | "error";
  };
}

interface ProgressEvent {
  type: "progress";
  data: {
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
  };
}

interface ConnectedEvent {
  type: "connected";
  data: {
    testRunId: number;
    status: TestStatus;
  };
}

interface CompleteEvent {
  type: "complete";
  data: {
    status: TestStatus;
    completedAt: string;
  };
}

interface ErrorEvent {
  type: "error";
  data: {
    message: string;
  };
}

type SSEEvent =
  | LiveMetricEvent
  | LogEvent
  | ProgressEvent
  | ConnectedEvent
  | CompleteEvent
  | ErrorEvent;

export interface LiveMetricsData {
  testRunId: number;
  elapsed: number;
  transactions: AggregateMetric[];
  overall: AggregateMetric;
  baselineComparisons?: BaselineComparison[];
  status: TestStatus;
  progress: number;
  currentPhase: TestPhase | null;
}

export interface LogEntry {
  id: number;
  message: string;
  level: "info" | "warn" | "error";
  timestamp: Date;
}

export interface UseLiveMetricsOptions {
  maxLogs?: number;
  onStatusChange?: (status: TestStatus) => void;
  onComplete?: (data: CompleteEvent["data"]) => void;
  onError?: (message: string) => void;
}

export interface UseLiveMetricsReturn {
  data: LiveMetricsData | null;
  logs: LogEntry[];
  isConnected: boolean;
  error: string | null;
  reconnectCount: number;
  clearLogs: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useLiveMetrics(
  testRunId: number | null,
  options: UseLiveMetricsOptions = {}
): UseLiveMetricsReturn {
  const { maxLogs = 100, onStatusChange, onComplete, onError } = options;

  const [data, setData] = useState<LiveMetricsData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const logIdRef = useRef(0);
  const maxReconnectAttempts = 5;

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const addLog = useCallback(
    (message: string, level: "info" | "warn" | "error") => {
      const id = ++logIdRef.current;
      setLogs((prev) => {
        const newLogs = [
          ...prev,
          { id, message, level, timestamp: new Date() },
        ];
        return newLogs.slice(-maxLogs);
      });
    },
    [maxLogs]
  );

  const connect = useCallback(() => {
    if (testRunId === null) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/tests/${testRunId}/live`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      reconnectCountRef.current = 0;
      setReconnectCount(0);
      setIsConnected(true);
      setError(null);
    });

    eventSource.addEventListener("metric", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as LiveMetricEvent["data"];
        setData({
          testRunId: parsed.testRunId,
          elapsed: parsed.elapsed,
          transactions: parsed.transactions,
          overall: parsed.overall,
          baselineComparisons: parsed.baselineComparisons,
          status: parsed.status,
          progress: parsed.progress,
          currentPhase: parsed.currentPhase,
        });

        if (parsed.status) {
          onStatusChange?.(parsed.status);
        }
      } catch {
        console.error("Failed to parse metric event");
      }
    });

    eventSource.addEventListener("log", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as LogEvent["data"];
        addLog(parsed.message, parsed.level);
      } catch {
        console.error("Failed to parse log event");
      }
    });

    eventSource.addEventListener("progress", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as ProgressEvent["data"];
        if (parsed.data?.message) {
          addLog(String(parsed.data.message), "info");
        }
      } catch {
        console.error("Failed to parse progress event");
      }
    });

    eventSource.addEventListener("complete", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as CompleteEvent["data"];
        setIsConnected(false);
        onComplete?.(parsed);
        eventSource.close();
      } catch {
        console.error("Failed to parse complete event");
      }
    });

    eventSource.addEventListener("error", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as ErrorEvent["data"];
        setError(parsed.message);
        onError?.(parsed.message);
      } catch {
        // Connection error, try to reconnect
        eventSource.close();
        eventSourceRef.current = null;

        const shouldReconnect = reconnectCountRef.current < maxReconnectAttempts;
        setIsConnected(false);

        if (shouldReconnect) {
          reconnectCountRef.current++;
          setReconnectCount(reconnectCountRef.current);
          setError(
            `Connection lost. Reconnecting... (${reconnectCountRef.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          setError("Connection failed. Max reconnection attempts reached.");
        }
      }
    });

    eventSource.onerror = () => {
      // Handled by the custom error event listener
    };
  }, [testRunId, addLog, onStatusChange, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    reconnectCountRef.current = 0;
    setIsConnected(false);
    setReconnectCount(0);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setError(null);
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    if (testRunId !== null) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [testRunId, connect, disconnect]);

  return {
    data,
    logs,
    isConnected,
    error,
    reconnectCount,
    clearLogs,
    disconnect,
    reconnect,
  };
}
