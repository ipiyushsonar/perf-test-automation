"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  FileText,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  totalReports: number;
  recentTests: Array<{
    id: number;
    name: string | null;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState({
    influxdb: "checking",
    grafana: "checking",
    confluence: "checking",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch {
        // Fallback stats
        setStats({
          totalTests: 0,
          completedTests: 0,
          failedTests: 0,
          totalReports: 0,
          recentTests: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    // Check connections
    const checkConnections = async () => {
      try {
        const grafanaRes = await fetch("/api/grafana/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const grafanaData = await grafanaRes.json();
        setConnections((prev) => ({
          ...prev,
          grafana: grafanaData.success && grafanaData.data?.connected
            ? "connected"
            : "not configured",
        }));
      } catch {
        setConnections((prev) => ({ ...prev, grafana: "not configured" }));
      }
    };
    checkConnections();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-60" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500">Connected</Badge>;
      case "checking":
        return <Badge variant="outline">Checking...</Badge>;
      default:
        return <Badge variant="outline">Not configured</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Performance test automation overview
          </p>
        </div>
        <Link href="/tests/new">
          <Button>
            <Play className="mr-2 h-4 w-4" />
            New Test Run
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTests ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalTests === 0 ? "No tests run yet" : "All test runs"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedTests ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful test runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failedTests ?? 0}</div>
            <p className="text-xs text-muted-foreground">Failed test runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalReports ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Generated reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
            <CardDescription>Latest test run activity</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentTests?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No test runs yet. Create your first test to get started.
                </p>
                <Link href="/tests/new" className="mt-4">
                  <Button variant="outline" size="sm">
                    <Play className="mr-2 h-3 w-3" />
                    Run First Test
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentTests.slice(0, 5).map((test) => (
                  <Link
                    key={test.id}
                    href={`/tests/${test.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <span className="font-medium">
                        #{test.id} {test.name || "Test Run"}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(test.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        test.status === "completed"
                          ? "default"
                          : test.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {test.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/tests/new">
                <Button variant="outline" className="w-full justify-start">
                  <Play className="mr-2 h-4 w-4" />
                  Start New Test Run
                </Button>
              </Link>
              <Link href="/scenarios">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  Manage Scenarios
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  Configure Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Integration connectivity status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">InfluxDB</span>
              </div>
              {statusBadge(connections.influxdb)}
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Grafana</span>
              </div>
              {statusBadge(connections.grafana)}
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Confluence</span>
              </div>
              {statusBadge(connections.confluence)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
