"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Play, Activity, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface TestRun {
  id: number;
  name: string | null;
  scenarioId: number;
  status: string;
  userCount: number;
  durationMinutes: number;
  rampUpSeconds: number | null;
  runnerType: string;
  totalSamples: number | null;
  errorCount: number | null;
  errorPercent: number | null;
  averageResponseTime: number | null;
  p90ResponseTime: number | null;
  p95ResponseTime: number | null;
  throughput: number | null;
  startedAt: string | null;
  completedAt: string | null;
  resultFile: string | null;
  createdAt: string;
}

interface TestStat {
  id: number;
  transactionName: string;
  sampleCount: number;
  errorCount: number;
  errorPercent: number | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
  throughput: number | null;
  status: string | null;
  regressionSeverity: string | null;
}

export default function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [test, setTest] = useState<TestRun | null>(null);
  const [stats, setStats] = useState<TestStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, statsRes] = await Promise.all([
          fetch(`/api/tests/${id}/status`),
          fetch(`/api/tests/${id}/status`), // stats included in status
        ]);
        const testData = await testRes.json();
        if (testData.success) {
          setTest(testData.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-60" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Test run #{id} not found.</p>
        <Link href="/tests" className="mt-4">
          <Button variant="outline">Back to Tests</Button>
        </Link>
      </div>
    );
  }

  const statusColor =
    test.status === "completed"
      ? "default"
      : test.status === "running"
        ? "default"
        : test.status === "failed"
          ? "destructive"
          : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Test Run #{id}
            </h1>
            <Badge variant={statusColor as "default" | "secondary" | "destructive"}>
              {test.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {test.name || "Test execution details and results"}
          </p>
        </div>
        <div className="flex gap-2">
          {test.status === "running" && (
            <Link href={`/tests/${id}/live`}>
              <Button variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Live View
              </Button>
            </Link>
          )}
          {test.resultFile && (
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {test.totalSamples?.toLocaleString() ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {test.errorPercent != null ? `${test.errorPercent.toFixed(2)}%` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {test.averageResponseTime != null
                ? `${Math.round(test.averageResponseTime)} ms`
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {test.throughput != null ? `${test.throughput.toFixed(1)} TPS` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Users:</span>{" "}
              <span className="font-medium">{test.userCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>{" "}
              <span className="font-medium">{test.durationMinutes} min</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ramp-up:</span>{" "}
              <span className="font-medium">{test.rampUpSeconds}s</span>
            </div>
            <div>
              <span className="text-muted-foreground">Runner:</span>{" "}
              <Badge variant="secondary">{test.runnerType}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Started:</span>{" "}
              <span className="font-medium">
                {test.startedAt ? new Date(test.startedAt).toLocaleString() : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>{" "}
              <span className="font-medium">
                {test.completedAt ? new Date(test.completedAt).toLocaleString() : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">P90:</span>{" "}
              <span className="font-medium">
                {test.p90ResponseTime != null ? `${Math.round(test.p90ResponseTime)} ms` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">P95:</span>{" "}
              <span className="font-medium">
                {test.p95ResponseTime != null ? `${Math.round(test.p95ResponseTime)} ms` : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
