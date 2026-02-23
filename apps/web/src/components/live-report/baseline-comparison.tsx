"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Minus, TrendingUp, AlertTriangle } from "lucide-react";
import type { BaselineComparison } from "@perf-test/types";

interface BaselineComparisonTableProps {
  comparisons: BaselineComparison[];
  title?: string;
}

function formatChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getSeverityIcon(severity: BaselineComparison["severity"]) {
  switch (severity) {
    case "improved":
      return <ArrowDown className="h-4 w-4 text-success" />;
    case "degraded":
      return <TrendingUp className="h-4 w-4 text-warning" />;
    case "critical":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSeverityBadge(severity: BaselineComparison["severity"]): {
  variant: "default" | "destructive" | "outline" | "secondary";
  className?: string;
} {
  switch (severity) {
    case "improved":
      return { variant: "outline", className: "text-success border-success" };
    case "degraded":
      return { variant: "secondary", className: "bg-warning/10 text-warning" };
    case "critical":
      return { variant: "destructive" };
    default:
      return { variant: "secondary" };
  }
}

export function BaselineComparisonTable({
  comparisons,
  title = "Baseline Comparison",
}: BaselineComparisonTableProps) {
  const sortedComparisons = useMemo(() => {
    return [...comparisons].sort((a, b) => {
      const severityOrder = { critical: 0, degraded: 1, stable: 2, improved: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [comparisons]);

  const summary = useMemo(() => {
    const counts = {
      improved: 0,
      stable: 0,
      degraded: 0,
      critical: 0,
    };

    for (const c of comparisons) {
      counts[c.severity]++;
    }

    return counts;
  }, [comparisons]);

  if (comparisons.length === 0) {
    return (
      <div className="rounded-md border p-6 text-center text-muted-foreground">
        No baseline comparison available. Configure a baseline to see comparisons.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2 text-sm">
          {summary.improved > 0 && (
            <Badge variant="outline" className="text-success border-success">
              <ArrowDown className="h-3 w-3 mr-1" />
              {summary.improved} Improved
            </Badge>
          )}
          {summary.stable > 0 && (
            <Badge variant="secondary">
              {summary.stable} Stable
            </Badge>
          )}
          {summary.degraded > 0 && (
            <Badge variant="secondary" className="bg-warning/10 text-warning">
              <TrendingUp className="h-3 w-3 mr-1" />
              {summary.degraded} Degraded
            </Badge>
          )}
          {summary.critical > 0 && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {summary.critical} Critical
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead className="text-right">Current P90 (ms)</TableHead>
              <TableHead className="text-right">Baseline P90 (ms)</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedComparisons.map((row, index) => {
              const badge = getSeverityBadge(row.severity);

              return (
                <TableRow key={`${row.transactionName}-${index}`}>
                  <TableCell>
                    {getSeverityIcon(row.severity)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.transactionName}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.currentP90.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {row.baselineP90.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        row.changePercent > 0
                          ? "text-destructive"
                          : row.changePercent < 0
                          ? "text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {formatChange(row.changePercent)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={badge.variant} className={badge.className}>
                      {row.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground">
        <strong>Legend:</strong> Improved = P90 decreased by 10%+ | Stable = Within ±10% | 
        Degraded = Increased 10-25% | Critical = Increased 25%+
      </div>
    </div>
  );
}
