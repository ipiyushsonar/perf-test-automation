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
import { FileText, Download, ExternalLink, Send } from "lucide-react";

interface Report {
  id: number;
  name: string;
  type: string;
  status: string;
  totalTransactions: number | null;
  improvedCount: number | null;
  degradedCount: number | null;
  criticalCount: number | null;
  overallStatus: string | null;
  excelFilePath: string | null;
  htmlFilePath: string | null;
  confluencePublished: boolean | null;
  confluenceUrl: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/reports");
        const data = await res.json();
        if (data.success) setReports(data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handlePublish = async (reportId: number) => {
    await fetch(`/api/confluence/publish/${reportId}`, { method: "POST" });
    // Refresh
    const res = await fetch("/api/reports");
    const data = await res.json();
    if (data.success) setReports(data.data);
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  const overallStatusColor = (status: string | null) => {
    switch (status) {
      case "pass": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "fail": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-60" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">View and manage generated performance reports</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" /> Generate Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>Excel and HTML reports with comparison data</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No reports generated yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="secondary">{r.type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status) as "default" | "secondary" | "destructive"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.overallStatus && (
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${overallStatusColor(r.overallStatus)}`} />
                          <span className="capitalize">{r.overallStatus}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.totalTransactions != null ? (
                        <span>
                          {r.totalTransactions} ({r.improvedCount}↑ {r.degradedCount}↓ {r.criticalCount}!)
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.excelFilePath && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`/api/reports/${r.id}/download/excel`}>
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        {r.htmlFilePath && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={`/api/reports/${r.id}/html`} target="_blank">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        {!r.confluencePublished && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePublish(r.id)}>
                            <Send className="h-3 w-3" />
                          </Button>
                        )}
                        {r.confluenceUrl && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={r.confluenceUrl} target="_blank">
                              <ExternalLink className="h-3 w-3 text-blue-500" />
                            </a>
                          </Button>
                        )}
                      </div>
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
