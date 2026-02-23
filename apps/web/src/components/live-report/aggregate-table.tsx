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
import type { AggregateMetric } from "@perf-test/types";

interface AggregateTableProps {
  transactions: AggregateMetric[];
  overall?: AggregateMetric;
  title?: string;
  showThroughput?: boolean;
}

function formatNumber(value: number, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }
  return value.toFixed(decimals);
}

function formatPercent(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(2)}%`;
}

function getErrorSeverity(errorPercent: number): "default" | "warning" | "destructive" {
  if (errorPercent === 0) return "default";
  if (errorPercent < 1) return "warning";
  return "destructive";
}

export function AggregateTable({
  transactions,
  overall,
  title = "Transaction Metrics",
  showThroughput = true,
}: AggregateTableProps) {
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (a.transactionName === "Overall") return -1;
      if (b.transactionName === "Overall") return 1;
      return a.transactionName.localeCompare(b.transactionName);
    });
  }, [transactions]);

  const displayRows = overall ? [...sortedTransactions, overall] : sortedTransactions;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Transaction</TableHead>
              <TableHead className="text-right">Samples</TableHead>
              <TableHead className="text-right">Errors</TableHead>
              <TableHead className="text-right">Error %</TableHead>
              <TableHead className="text-right">Mean (ms)</TableHead>
              <TableHead className="text-right">Min (ms)</TableHead>
              <TableHead className="text-right">Max (ms)</TableHead>
              <TableHead className="text-right">P90 (ms)</TableHead>
              <TableHead className="text-right">P95 (ms)</TableHead>
              <TableHead className="text-right">P99 (ms)</TableHead>
              {showThroughput && (
                <TableHead className="text-right">Throughput</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showThroughput ? 11 : 10}
                  className="text-center text-muted-foreground h-24"
                >
                  No metrics available yet. Waiting for test data...
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((tx, index) => {
                const isOverall = tx.transactionName === "Overall";
                const errorSeverity = getErrorSeverity(tx.errorPercent);

                return (
                  <TableRow
                    key={`${tx.transactionName}-${index}`}
                    className={isOverall ? "bg-muted/50 font-medium" : ""}
                  >
                    <TableCell className="font-medium">
                      {tx.transactionName}
                      {isOverall && (
                        <Badge variant="outline" className="ml-2">
                          Summary
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.sampleCount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.errorCount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={errorSeverity}>
                        {formatPercent(tx.errorPercent)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.mean)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.min)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.max)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(tx.p90)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.p95)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(tx.p99)}
                    </TableCell>
                    {showThroughput && (
                      <TableCell className="text-right">
                        {formatNumber(tx.throughput, 2)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
