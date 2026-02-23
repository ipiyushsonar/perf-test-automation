import type { ComparisonData, TransactionComparison, ThresholdConfig } from "../types";

export interface ChartImage {
  base64: string;
  width: number;
  height: number;
}

const COLORS = {
  primary: "rgba(59, 130, 246, 0.8)",
  secondary: "rgba(139, 92, 246, 0.8)",
  tertiary: "rgba(236, 72, 153, 0.8)",
  baseline: "rgba(107, 114, 128, 0.8)",
  improved: "rgba(34, 197, 94, 0.8)",
  degraded: "rgba(249, 115, 22, 0.8)",
  critical: "rgba(239, 68, 68, 0.8)",
  stable: "rgba(59, 130, 246, 0.8)",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.tertiary,
  "rgba(16, 185, 129, 0.8)",
  "rgba(245, 158, 11, 0.8)",
  "rgba(239, 68, 68, 0.8)",
  "rgba(139, 92, 246, 0.8)",
  "rgba(236, 72, 153, 0.8)",
];

async function getChartModules() {
  const { Chart, registerables } = await import("chart.js");
  const { createCanvas } = await import("canvas");
  Chart.register(...registerables);
  return { Chart, createCanvas };
}

export async function generateResponseTimeChart(
  comparison: ComparisonData,
  options: { width?: number; height?: number } = {}
): Promise<ChartImage> {
  const { Chart, createCanvas } = await getChartModules();
  
  const width = options.width || 800;
  const height = options.height || 500;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  const labels: string[] = comparison.transactions.slice(0, 10).map((tx) => tx.transactionName);

  const datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }> = [];

  comparison.testRuns.forEach((run, index) => {
    datasets.push({
      label: `v${run.version} P90`,
      data: comparison.transactions.slice(0, 10).map((tx) => {
        const version = tx.versions.find((v) => v.versionId === run.versionId);
        return version?.p90 || 0;
      }),
      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
      borderColor: CHART_COLORS[index % CHART_COLORS.length].replace("0.8", "1"),
      borderWidth: 1,
    });
  });

  if (comparison.baseline) {
    datasets.push({
      label: "Baseline P90",
      data: comparison.transactions.slice(0, 10).map((tx) => tx.baseline?.p90 || 0),
      backgroundColor: COLORS.baseline,
      borderColor: "rgba(107, 114, 128, 1)",
      borderWidth: 2,
    });
  }

  const chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Response Time Comparison (P90)",
          font: { size: 16, weight: "bold" as const },
        },
        legend: {
          position: "bottom" as const,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Response Time (ms)",
          },
        },
      },
    },
  });

  chart.draw();

  const base64 = canvas.toDataURL("image/png").split(",")[1] || "";

  chart.destroy();

  return { base64, width, height };
}

export async function generateThroughputChart(
  comparison: ComparisonData,
  options: { width?: number; height?: number } = {}
): Promise<ChartImage> {
  const { Chart, createCanvas } = await getChartModules();
  
  const width = options.width || 800;
  const height = options.height || 500;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  const labels: string[] = comparison.transactions.slice(0, 10).map((tx) => tx.transactionName);

  const datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }> = [];

  comparison.testRuns.forEach((run, index) => {
    datasets.push({
      label: `v${run.version}`,
      data: comparison.transactions.slice(0, 10).map((tx) => {
        const version = tx.versions.find((v) => v.versionId === run.versionId);
        return version?.throughput || 0;
      }),
      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
      borderColor: CHART_COLORS[index % CHART_COLORS.length].replace("0.8", "1"),
      borderWidth: 1,
    });
  });

  if (comparison.baseline) {
    datasets.push({
      label: "Baseline",
      data: comparison.transactions.slice(0, 10).map((tx) => tx.baseline?.throughput || 0),
      backgroundColor: COLORS.baseline,
      borderColor: "rgba(107, 114, 128, 1)",
      borderWidth: 2,
    });
  }

  const chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Throughput Comparison (req/sec)",
          font: { size: 16, weight: "bold" as const },
        },
        legend: {
          position: "bottom" as const,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Throughput (req/sec)",
          },
        },
      },
    },
  });

  chart.draw();

  const base64 = canvas.toDataURL("image/png").split(",")[1] || "";

  chart.destroy();

  return { base64, width, height };
}

export async function generateErrorRateChart(
  comparison: ComparisonData,
  options: { width?: number; height?: number } = {}
): Promise<ChartImage> {
  const { Chart, createCanvas } = await getChartModules();
  
  const width = options.width || 800;
  const height = options.height || 500;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  const labels: string[] = comparison.transactions.slice(0, 10).map((tx) => tx.transactionName);

  const datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }> = [];

  comparison.testRuns.forEach((run, index) => {
    datasets.push({
      label: `v${run.version}`,
      data: comparison.transactions.slice(0, 10).map((tx) => {
        const version = tx.versions.find((v) => v.versionId === run.versionId);
        return version?.errorPercent || 0;
      }),
      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
      borderColor: CHART_COLORS[index % CHART_COLORS.length].replace("0.8", "1"),
      borderWidth: 1,
    });
  });

  if (comparison.baseline) {
    datasets.push({
      label: "Baseline",
      data: comparison.transactions.slice(0, 10).map((tx) => tx.baseline?.errorPercent || 0),
      backgroundColor: COLORS.baseline,
      borderColor: "rgba(107, 114, 128, 1)",
      borderWidth: 2,
    });
  }

  const chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Error Rate Comparison (%)",
          font: { size: 16, weight: "bold" as const },
        },
        legend: {
          position: "bottom" as const,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Error Rate (%)",
          },
        },
      },
    },
  });

  chart.draw();

  const base64 = canvas.toDataURL("image/png").split(",")[1] || "";

  chart.destroy();

  return { base64, width, height };
}

export async function generateSeverityDistributionChart(
  comparison: ComparisonData,
  summary: { improvedCount: number; stableCount: number; degradedCount: number; criticalCount: number },
  options: { width?: number; height?: number } = {}
): Promise<ChartImage> {
  const { Chart, createCanvas } = await getChartModules();
  
  const width = options.width || 600;
  const height = options.height || 400;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  const chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Improved", "Stable", "Degraded", "Critical"],
      datasets: [
        {
          data: [summary.improvedCount, summary.stableCount, summary.degradedCount, summary.criticalCount],
          backgroundColor: [COLORS.improved, COLORS.stable, COLORS.degraded, COLORS.critical],
          borderColor: ["rgba(34, 197, 94, 1)", "rgba(59, 130, 246, 1)", "rgba(249, 115, 22, 1)", "rgba(239, 68, 68, 1)"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Performance Distribution",
          font: { size: 16, weight: "bold" as const },
        },
        legend: {
          position: "bottom" as const,
        },
      },
    },
  });

  chart.draw();

  const base64 = canvas.toDataURL("image/png").split(",")[1] || "";

  chart.destroy();

  return { base64, width, height };
}

export async function generateAllCharts(
  comparison: ComparisonData,
  summary: { improvedCount: number; stableCount: number; degradedCount: number; criticalCount: number }
): Promise<{
  responseTime: ChartImage;
  throughput: ChartImage;
  errorRate: ChartImage;
  severityDistribution: ChartImage;
}> {
  const [responseTime, throughput, errorRate, severityDistribution] = await Promise.all([
    generateResponseTimeChart(comparison),
    generateThroughputChart(comparison),
    generateErrorRateChart(comparison),
    generateSeverityDistributionChart(comparison, summary),
  ]);

  return {
    responseTime,
    throughput,
    errorRate,
    severityDistribution,
  };
}
