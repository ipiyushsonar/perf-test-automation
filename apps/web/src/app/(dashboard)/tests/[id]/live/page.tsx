"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { useLiveMetrics } from "@/lib/hooks";
import {
  AggregateTable,
  ResponseTimeChart,
  ThroughputChart,
  ErrorAnalysis,
  BaselineComparisonTable,
} from "@/components/live-report";
import type { TestStatus } from "@perf-test/types";

interface TestRun {
  id: number;
  name: string | null;
  status: TestStatus;
  progress: number;
  currentPhase: string | null;
  startedAt: string | null;
  scenario: { name: string; displayName: string } | null;
  testType: { name: string; displayName: string } | null;
  version: { version: string; displayName: string | null } | null;
  baseline: { name: string } | null;
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function getStatusIcon(status: TestStatus) {
  switch (status) {
    case "running":
      return <Play className="h-4 w-4 animate-pulse text-blue-500" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
    case "cancelled":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "cooldown":
      return <Pause className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: TestStatus): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "running":
      return "default";
    case "completed":
      return "default";
    case "failed":
    case "cancelled":
      return "destructive";
    case "cooldown":
      return "secondary";
    default:
      return "outline";
  }
}

export default function LiveReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [testRunId, setTestRunId] = useState<number | null>(null);
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"metrics" | "logs">("metrics");

  useEffect(() => {
    params.then((resolved) => {
      const id = parseInt(resolved.id, 10);
      if (!isNaN(id)) {
        setTestRunId(id);
        fetchTestRun(id);
      } else {
        setError("Invalid test run ID");
        setLoading(false);
      }
    });
  }, [params]);

  const fetchTestRun = async (id: number) => {
    try {
      const response = await fetch(`/api/tests/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch test run");
      }
      const result = await response.json();
      if (result.success) {
        setTestRun(result.data);
      } else {
        setError(result.error || "Failed to load test run");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status: TestStatus) => {
    if (testRun) {
      setTestRun({ ...testRun, status });
    }
  };

  const handleComplete = () => {
    if (testRunId) {
      fetchTestRun(testRunId);
    }
  };

  const {
    data: liveData,
    logs,
    isConnected,
    error: connectionError,
    reconnectCount,
    clearLogs,
    reconnect,
  } = useLiveMetrics(testRunId, {
    onStatusChange: handleStatusChange,
    onComplete: handleComplete,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !testRun) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Error</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Test run not found"}</p>
            <Link href="/tests">
              <Button className="mt-4">Back to Tests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTestActive = ["running", "cooldown", "queued"].includes(testRun.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {testRun.name || `Test Run #${testRun.id}`}
            </h1>
            <p className="text-muted-foreground">
              {testRun.scenario?.displayName} - {testRun.testType?.displayName} - v{testRun.version?.version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Badge variant="outline" className="text-success border-success">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-destructive border-destructive">
              <WifiOff className="h-3 w-3 mr-1" />
              {reconnectCount > 0 ? `Reconnecting (${reconnectCount}/5)` : "Disconnected"}
            </Badge>
          )}
          <Badge variant={getStatusBadgeVariant(testRun.status)}>
            {getStatusIcon(testRun.status)}
            <span className="ml-1 capitalize">{testRun.status}</span>
          </Badge>
        </div>
      </div>

      {connectionError && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{connectionError}</span>
              <Button variant="outline" size="sm" onClick={reconnect} className="ml-auto">
                Reconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Elapsed Time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {liveData ? formatElapsed(liveData.elapsed) : "--:--"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {liveData?.progress ?? testRun.progress}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Samples</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {liveData?.overall?.sampleCount?.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {liveData?.overall?.errorCount?.toLocaleString() || "0"}
              {liveData?.overall?.errorPercent !== undefined && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({liveData.overall.errorPercent.toFixed(2)}%)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("metrics")}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "metrics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4 inline mr-1" />
            Metrics
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "logs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="h-4 w-4 inline mr-1" />
            Logs ({logs.length})
          </button>
        </div>
      </div>

      {activeTab === "metrics" && (
        <div className="space-y-6">
          {liveData?.transactions && liveData.transactions.length > 0 && (
            <>
              <AggregateTable
                transactions={liveData.transactions.filter(t => t.transactionName !== "Overall")}
                overall={liveData.overall}
              />

              <Separator />

              <div className="grid gap-6 lg:grid-cols-2">
                <ResponseTimeChart transactions={liveData.transactions} />
                <ThroughputChart transactions={liveData.transactions} />
              </div>

              <Separator />

              <div className="grid gap-6 lg:grid-cols-2">
                <ErrorAnalysis transactions={liveData.transactions} />
                {liveData.baselineComparisons && (
                  <BaselineComparisonTable comparisons={liveData.baselineComparisons} />
                )}
              </div>
            </>
          )}

          {!liveData?.transactions?.length && isTestActive && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p>Waiting for test data from InfluxDB...</p>
                <p className="text-sm mt-1">
                  Metrics will appear once JMeter starts sending data.
                </p>
              </CardContent>
            </Card>
          )}

          {!isTestActive && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Test {testRun.status}. No live data available.</p>
                <Link href={`/tests/${testRun.id}`}>
                  <Button variant="outline" className="mt-4">
                    View Test Results
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Execution Logs</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded border bg-muted/30 p-2">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No logs available yet
                </p>
              ) : (
                <div className="font-mono text-sm space-y-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex gap-2 ${
                        log.level === "error"
                          ? "text-destructive"
                          : log.level === "warn"
                          ? "text-yellow-500"
                          : "text-foreground"
                      }`}
                    >
                      <span className="text-muted-foreground shrink-0">
                        [{log.timestamp.toLocaleTimeString()}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
