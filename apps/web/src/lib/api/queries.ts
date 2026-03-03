import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { toast } from "sonner";

// ===========================================
// Shared mutation options with toast feedback
// ===========================================

function mutationWithToast<TData, TVariables>(opts: {
    mutationFn: (vars: TVariables) => Promise<TData>;
    successMessage: string;
    errorMessage?: string;
    invalidateKeys: string[][];
}) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: opts.mutationFn,
        onSuccess: () => {
            opts.invalidateKeys.forEach((key) =>
                qc.invalidateQueries({ queryKey: key })
            );
            toast.success(opts.successMessage);
        },
        onError: (err) => {
            toast.error(
                err instanceof Error
                    ? err.message
                    : opts.errorMessage || "Operation failed"
            );
        },
    });
}

// ===========================================
// Dashboard
// ===========================================

interface DashboardStats {
    totalRuns: number;
    runningTests: number;
    totalScenarios: number;
    totalBaselines: number;
    recentTests: unknown[];
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ["dashboard"],
        queryFn: () => api.get<DashboardStats>("/api/dashboard"),
        refetchInterval: 30_000,
    });
}

// ===========================================
// Versions
// ===========================================

interface Version {
    id: number;
    version: string;
    displayName: string | null;
    releaseDate: string | null;
    description: string | null;
    isActive: boolean | null;
    createdAt: string;
    updatedAt: string | null;
}

interface CreateVersionInput {
    version: string;
    displayName?: string;
    releaseDate?: string;
    description?: string;
}

export function useVersions() {
    return useQuery({
        queryKey: ["versions"],
        queryFn: () => api.get<Version[]>("/api/versions"),
    });
}

export function useCreateVersion() {
    return mutationWithToast<Version, CreateVersionInput>({
        mutationFn: (data) => api.post<Version>("/api/versions", data),
        successMessage: "Version created",
        invalidateKeys: [["versions"]],
    });
}

export function useUpdateVersion() {
    return mutationWithToast<Version, { id: number; data: Partial<CreateVersionInput> }>({
        mutationFn: ({ id, data }) => api.put<Version>(`/api/versions/${id}`, data),
        successMessage: "Version updated",
        invalidateKeys: [["versions"]],
    });
}

export function useDeleteVersion() {
    return mutationWithToast<void, number>({
        mutationFn: (id) => api.delete<void>(`/api/versions/${id}`),
        successMessage: "Version deleted",
        invalidateKeys: [["versions"]],
    });
}

// ===========================================
// Baselines
// ===========================================

interface Baseline {
    id: number;
    name: string;
    description: string | null;
    scenarioId: number | null;
    versionId: number | null;
    sourceTestRunId: number | null;
    isDefault: boolean | null;
    isActive: boolean | null;
    createdAt: string;
    updatedAt: string | null;
}

interface CreateBaselineInput {
    name: string;
    description?: string;
    sourceTestRunId?: number | null;
    scenarioId?: number;
    testTypeId?: number;
    versionId?: number;
}

export function useBaselines() {
    return useQuery({
        queryKey: ["baselines"],
        queryFn: () => api.get<Baseline[]>("/api/baselines"),
    });
}

export function useCreateBaseline() {
    return mutationWithToast<Baseline, CreateBaselineInput>({
        mutationFn: (data) => api.post<Baseline>("/api/baselines", data),
        successMessage: "Baseline created",
        invalidateKeys: [["baselines"]],
    });
}

export function useSetDefaultBaseline() {
    return mutationWithToast<void, number>({
        mutationFn: (id) => api.post<void>(`/api/baselines/${id}/set-default`, {}),
        successMessage: "Default baseline updated",
        invalidateKeys: [["baselines"]],
    });
}

export function useDeleteBaseline() {
    return mutationWithToast<void, number>({
        mutationFn: (id) => api.delete<void>(`/api/baselines/${id}`),
        successMessage: "Baseline deleted",
        invalidateKeys: [["baselines"]],
    });
}

// ===========================================
// Scenarios
// ===========================================

interface Scenario {
    id: number;
    name: string;
    displayName: string;
    description: string | null;
    testType: string;
    loadUserCount: number | null;
    stressUserCount: number | null;
    durationMinutes: number | null;
    rampUpSeconds: number | null;
    cooldownSeconds: number | null;
    isActive: boolean | null;
    createdAt: string;
    updatedAt: string | null;
}

interface CreateScenarioInput {
    name: string;
    displayName: string;
    description?: string;
    testType?: string;
    loadUserCount?: number;
    stressUserCount?: number;
    durationMinutes?: number;
    rampUpSeconds?: number;
    cooldownSeconds?: number;
}

export function useScenarios() {
    return useQuery({
        queryKey: ["scenarios"],
        queryFn: () => api.get<Scenario[]>("/api/scenarios"),
    });
}

export function useCreateScenario() {
    return mutationWithToast<Scenario, CreateScenarioInput>({
        mutationFn: (data) => api.post<Scenario>("/api/scenarios", data),
        successMessage: "Scenario created",
        invalidateKeys: [["scenarios"]],
    });
}

export function useUpdateScenario() {
    return mutationWithToast<Scenario, { id: number; data: Partial<CreateScenarioInput> }>({
        mutationFn: ({ id, data }) => api.put<Scenario>(`/api/scenarios/${id}`, data),
        successMessage: "Scenario updated",
        invalidateKeys: [["scenarios"]],
    });
}

export function useDeleteScenario() {
    return mutationWithToast<void, number>({
        mutationFn: (id) => api.delete<void>(`/api/scenarios/${id}`),
        successMessage: "Scenario deleted",
        invalidateKeys: [["scenarios"]],
    });
}

// ===========================================
// Tests
// ===========================================

interface TestRun {
    id: number;
    name: string | null;
    scenarioId: number;
    testTypeId: number;
    versionId: number;
    status: string;
    progress: number | null;
    currentPhase: string | null;
    startedAt: string | null;
    completedAt: string | null;
    totalSamples: number | null;
    errorCount: number | null;
    averageResponseTime: number | null;
    throughput: number | null;
    createdAt: string;
}

export function useTests(params?: { limit?: number; offset?: number }) {
    return useQuery({
        queryKey: ["tests", params],
        queryFn: () => {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.set("limit", String(params.limit));
            if (params?.offset) searchParams.set("offset", String(params.offset));
            const qs = searchParams.toString();
            return api.get<TestRun[]>(`/api/tests${qs ? `?${qs}` : ""}`);
        },
    });
}

// ===========================================
// Reports
// ===========================================

interface Report {
    id: number;
    name: string;
    type: string;
    status: string | null;
    totalTransactions: number | null;
    degradedCount: number | null;
    criticalCount: number | null;
    overallStatus: string | null;
    createdAt: string;
}

export function useReports() {
    return useQuery({
        queryKey: ["reports"],
        queryFn: () => api.get<Report[]>("/api/reports"),
    });
}

// ===========================================
// Schedules
// ===========================================

interface Schedule {
    id: number;
    name: string;
    description: string | null;
    cronExpression: string | null;
    nextRunAt: string | null;
    lastRunAt: string | null;
    scenarioId: number | null;
    testTypeId: number | null;
    isActive: boolean | null;
    createdAt: string;
}

export function useSchedules() {
    return useQuery({
        queryKey: ["schedules"],
        queryFn: () => api.get<Schedule[]>("/api/schedules"),
    });
}

export function useCreateSchedule() {
    return mutationWithToast<Schedule, Record<string, unknown>>({
        mutationFn: (data) => api.post<Schedule>("/api/schedules", data),
        successMessage: "Schedule created",
        invalidateKeys: [["schedules"]],
    });
}

export function useUpdateSchedule() {
    return mutationWithToast<Schedule, { id: number; data: Partial<Record<string, unknown>> }>({
        mutationFn: ({ id, data }) => api.put<Schedule>(`/api/schedules/${id}`, data),
        successMessage: "Schedule updated",
        invalidateKeys: [["schedules"]],
    });
}

export function useDeleteSchedule() {
    return mutationWithToast<void, number>({
        mutationFn: (id) => api.delete<void>(`/api/schedules/${id}`),
        successMessage: "Schedule deleted",
        invalidateKeys: [["schedules"]],
    });
}

// ===========================================
// Settings
// ===========================================

interface Setting {
    id: number;
    category: string;
    key: string;
    value: unknown;
    description: string | null;
}

export function useSettings(category?: string) {
    return useQuery({
        queryKey: ["settings", category],
        queryFn: () => api.get<Setting[]>(category ? `/api/settings?category=${category}` : "/api/settings"),
    });
}

export function useUpdateSettings() {
    return mutationWithToast<void, { category: string; settings: { key: string; value: unknown }[] }>({
        mutationFn: ({ category, settings }) =>
            api.put<void>(`/api/settings`, { category, settings }),
        successMessage: "Settings saved",
        invalidateKeys: [["settings"]],
    });
}

// ===========================================
// JMX Scripts
// ===========================================

interface JmxScript {
    id: number;
    name: string;
    description: string | null;
    filePath: string;
    fileSize: number | null;
    scenarioId: number | null;
    uploadedAt: string | null;
}

export function useScripts() {
    return useQuery({
        queryKey: ["scripts"],
        queryFn: () => api.get<JmxScript[]>("/api/scripts"),
    });
}

export function useUploadScript() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await fetch("/api/scripts", { method: "POST", body: formData });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");
            return json.data as JmxScript;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["scripts"] });
            toast.success("Script uploaded");
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Upload failed");
        },
    });
}

export function useDeleteScript() {
    return mutationWithToast<void, number>({
        mutationFn: (id) => api.delete<void>(`/api/scripts/${id}`),
        successMessage: "Script deleted",
        invalidateKeys: [["scripts"]],
    });
}
