"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AggregateMetric } from "@perf-test/types";

interface ThroughputChartProps {
  transactions: AggregateMetric[];
  title?: string;
  height?: number;
}

interface ChartDataPoint {
  name: string;
  throughput: number;
  samples: number;
}

export function ThroughputChart({
  transactions,
  title = "Throughput by Transaction",
  height = 300,
}: ThroughputChartProps) {
  const chartData = useMemo((): ChartDataPoint[] => {
    return transactions
      .filter((tx) => tx.transactionName !== "Overall")
      .map((tx) => ({
        name: tx.transactionName.length > 20 
          ? tx.transactionName.substring(0, 20) + "..."
          : tx.transactionName,
        throughput: tx.throughput,
        samples: tx.sampleCount,
      }))
      .sort((a, b) => b.throughput - a.throughput);
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] border rounded-md bg-muted/10">
        <p className="text-muted-foreground">
          No throughput data available yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11 }}
              height={80}
            />
            <YAxis
              label={{
                value: "Requests/sec",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "throughput") {
                  return [`${value.toFixed(2)} req/s`, "Throughput"];
                }
                return [value.toLocaleString(), "Samples"];
              }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar
              dataKey="throughput"
              name="Throughput"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
