import { z } from "zod";

// ==========================================
// Tests
// ==========================================

export const createTestSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    scenarioId: z.number().int().positive(),
    testTypeId: z.number().int().positive(),
    versionId: z.number().int().positive(),
    jmxScriptId: z.number().int().positive(),
    baselineId: z.number().int().positive().nullable().optional(),
    runnerType: z.enum(["local", "ssh", "jenkins"]).default("local"),
    runnerConfig: z.record(z.unknown()).optional(),
    userCount: z.number().int().min(1).max(10000),
    durationMinutes: z.number().int().min(1).max(1440),
    rampUpSeconds: z.number().int().min(0).max(3600).optional(),
});

export const updateTestSchema = createTestSchema.partial();

// ==========================================
// Versions
// ==========================================

export const createVersionSchema = z.object({
    version: z.string().min(1).max(50),
    displayName: z.string().max(100).optional(),
    releaseDate: z.string().optional(),
    description: z.string().max(1000).optional(),
});

export const updateVersionSchema = createVersionSchema.partial();

// ==========================================
// Baselines
// ==========================================

export const createBaselineSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    sourceTestRunId: z.number().int().positive().nullable().optional(),
    scenarioId: z.number().int().positive().optional(),
    testTypeId: z.number().int().positive().optional(),
    versionId: z.number().int().positive().optional(),
});

export const updateBaselineSchema = createBaselineSchema.partial();

// ==========================================
// Scenarios
// ==========================================

export const createScenarioSchema = z.object({
    name: z.string().min(1).max(50),
    displayName: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    testType: z.enum(["combined", "standalone"]).default("combined"),
    loadUserCount: z.number().int().min(1).optional(),
    stressUserCount: z.number().int().min(1).optional(),
    durationMinutes: z.number().int().min(1).max(1440).optional(),
    rampUpSeconds: z.number().int().min(0).max(3600).optional(),
    cooldownSeconds: z.number().int().min(0).max(7200).optional(),
    defaultJmxScriptId: z.number().int().positive().nullable().optional(),
    config: z.record(z.unknown()).optional(),
});

export const updateScenarioSchema = createScenarioSchema.partial();

// ==========================================
// Reports
// ==========================================

export const generateReportSchema = z.object({
    name: z.string().min(1).max(200),
    testRunIds: z.array(z.number().int().positive()).min(1),
    baselineId: z.number().int().positive().nullable().optional(),
    type: z.enum(["comparison", "single", "baseline"]).default("comparison"),
    outputFormats: z.array(z.enum(["excel", "html"])).default(["excel", "html"]),
    thresholds: z.record(z.number()).optional(),
});

// ==========================================
// Schedules
// ==========================================

export const createScheduleSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    cronExpression: z.string().max(100).optional(),
    scenarioId: z.number().int().positive().optional(),
    testTypeId: z.number().int().positive().optional(),
    versionId: z.number().int().positive().optional(),
    jmxScriptId: z.number().int().positive().optional(),
    isActive: z.boolean().default(true),
});

export const updateScheduleSchema = createScheduleSchema.partial();

// ==========================================
// Settings
// ==========================================

export const updateSettingsSchema = z.object({
    settings: z.array(
        z.object({
            key: z.string().min(1),
            value: z.unknown(),
        })
    ).min(1),
});
