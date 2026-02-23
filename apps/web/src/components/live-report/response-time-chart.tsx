"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AggregateMetric } from "@perf-test/types";

interface ResponseTimeChartProps {
  transactions: AggregateMetric[];
  title?: string;
  height?: number;
  showP90?: boolean;
  showP95?: boolean;
  showMean?: boolean;
}

interface ChartDataPoint {
  name: string;
  mean: number;
  p90: number;
  p95: number;
  p99: number;
}

export function ResponseTimeChart({
  transactions,
  title = "Response Time by Transaction",
  height = 400,
  showP90 = true,
  showP95 = true,
  showMean = true,
}: ResponseTimeChartProps) {
  const chartData = useMemo((): ChartDataPoint[] => {
    return transactions
      .filter((tx) => tx.transactionName !== "Overall")
      .map((tx) => ({
        name: tx.transactionName.length > 20 
          ? tx.transactionName.substring(0, 20) + "..."
          : tx.transactionName,
        mean: tx.mean,
        p90: tx.p90,
        p95: tx.p95,
        p99: tx.p99,
      }));
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] border rounded-md bg-muted/10">
        <p className="text-muted-foreground">
          No response time data available yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 12 }}
              height={80}
            />
            <YAxis
              label={{
                value: "Response Time (ms)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)} ms`, ""]}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend verticalAlign="top" height={36} />
            {showMean && (
              <Line
                type="monotone"
                dataKey="mean"
                name="Mean"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {showP90 && (
              <Line
                type="monotone"
                dataKey="p90"
                name="P90"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {showP95 && (
              <Line
                type="monotone"
                dataKey="p95"
                name="P95"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="p99"
              name="P99"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
