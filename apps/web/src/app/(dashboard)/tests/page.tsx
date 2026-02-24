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
import { Plus, Play } from "lucide-react";
import Link from "next/link";

interface TestRun {
  id: number;
  name: string | null;
  scenarioId: number;
  testTypeId: number;
  versionId: number;
  status: string;
  userCount: number;
  durationMinutes: number;
  totalSamples: number | null;
  errorPercent: number | null;
  averageResponseTime: number | null;
  throughput: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: "secondary",
  queued: "secondary",
  running: "default",
  completed: "default",
  failed: "destructive",
  cancelled: "secondary",
};

export default function TestsPage() {
  const [tests, setTests] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await fetch("/api/tests");
        const data = await res.json();
        if (data.success) setTests(data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            Manage and monitor performance test executions
          </p>
        </div>
        <Link href="/tests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Test
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
          <CardDescription>All test runs with status and results</CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Play className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No test runs found. Start your first test to see results here.
              </p>
              <Link href="/tests/new" className="mt-4">
                <Button variant="outline" size="sm">
                  <Play className="mr-2 h-3 w-3" />
                  Run First Test
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Samples</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Avg RT (ms)</TableHead>
                  <TableHead>TPS</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/tests/${test.id}`} className="font-medium">
                        #{test.id}
                      </Link>
                    </TableCell>
                    <TableCell>{test.name || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (statusColors[test.status] as "default" | "secondary" | "destructive") ||
                          "secondary"
                        }
                      >
                        {test.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{test.userCount}</TableCell>
                    <TableCell>{test.durationMinutes}min</TableCell>
                    <TableCell>{test.totalSamples ?? "—"}</TableCell>
                    <TableCell>
                      {test.errorPercent != null ? `${test.errorPercent.toFixed(2)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {test.averageResponseTime != null
                        ? Math.round(test.averageResponseTime)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {test.throughput != null ? test.throughput.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>
                      {test.startedAt
                        ? new Date(test.startedAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
