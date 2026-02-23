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
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import type { AggregateMetric } from "@perf-test/types";

interface ErrorAnalysisProps {
  transactions: AggregateMetric[];
  title?: string;
  showOnlyErrors?: boolean;
}

interface ErrorRow {
  transactionName: string;
  sampleCount: number;
  errorCount: number;
  errorPercent: number;
  severity: "none" | "low" | "medium" | "high";
}

function getSeverityIcon(severity: "none" | "low" | "medium" | "high") {
  switch (severity) {
    case "high":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "medium":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "low":
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <CheckCircle className="h-4 w-4 text-success" />;
  }
}

function getSeverityBadge(severity: "none" | "low" | "medium" | "high") {
  switch (severity) {
    case "high":
      return "destructive";
    case "medium":
      return "warning";
    case "low":
      return "secondary";
    default:
      return "outline";
  }
}

export function ErrorAnalysis({
  transactions,
  title = "Error Analysis",
  showOnlyErrors = false,
}: ErrorAnalysisProps) {
  const errorData = useMemo((): ErrorRow[] => {
    const data = transactions
      .filter((tx) => tx.transactionName !== "Overall")
      .map((tx) => {
        let severity: "none" | "low" | "medium" | "high";
        if (tx.errorPercent === 0) severity = "none";
        else if (tx.errorPercent < 1) severity = "low";
        else if (tx.errorPercent < 5) severity = "medium";
        else severity = "high";

        return {
          transactionName: tx.transactionName,
          sampleCount: tx.sampleCount,
          errorCount: tx.errorCount,
          errorPercent: tx.errorPercent,
          severity,
        };
      });

    if (showOnlyErrors) {
      return data.filter((row) => row.errorCount > 0);
    }

    return data.sort((a, b) => b.errorPercent - a.errorPercent);
  }, [transactions, showOnlyErrors]);

  const totalErrors = useMemo(() => {
    return errorData.reduce((sum, row) => sum + row.errorCount, 0);
  }, [errorData]);

  const hasErrors = totalErrors > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              {totalErrors.toLocaleString()} Error{totalErrors !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-success border-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              No Errors
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
              <TableHead className="text-right">Samples</TableHead>
              <TableHead className="text-right">Errors</TableHead>
              <TableHead className="text-right">Error Rate</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errorData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  {showOnlyErrors
                    ? "No errors detected"
                    : "No transactions to analyze"}
                </TableCell>
              </TableRow>
            ) : (
              errorData.map((row, index) => (
                <TableRow key={`${row.transactionName}-${index}`}>
                  <TableCell>
                    {getSeverityIcon(row.severity)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.transactionName}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.sampleCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.errorCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.errorPercent.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getSeverityBadge(row.severity) as "destructive" | "warning" | "secondary" | "outline"}>
                      {row.severity === "none"
                        ? "OK"
                        : row.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
