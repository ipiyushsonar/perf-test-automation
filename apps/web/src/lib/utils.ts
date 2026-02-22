import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "-";
  return value.toFixed(decimals);
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "-";
  return `${value.toFixed(decimals)}%`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-600 dark:text-green-400";
    case "running":
      return "text-blue-600 dark:text-blue-400";
    case "pending":
    case "queued":
      return "text-yellow-600 dark:text-yellow-400";
    case "failed":
      return "text-red-600 dark:text-red-400";
    case "cancelled":
      return "text-gray-600 dark:text-gray-400";
    case "cooldown":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-foreground";
  }
}

export function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "running":
    case "cooldown":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}
