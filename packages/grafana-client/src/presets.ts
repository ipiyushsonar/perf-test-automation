// ============================================
// Grafana Dashboard/Panel Presets
// ============================================

/**
 * Known panel IDs for the JMeter Grafana dashboard
 */
export const JMETER_DASHBOARD_PANELS = {
    responseTimesOverTime: 2,
    activeThreadsOverTime: 3,
    throughputOverTime: 4,
    errorsOverTime: 5,
    responseTimePercentiles: 6,
    connectTimeOverTime: 7,
    bytesPerSecond: 8,
    codesPerSecond: 9,
    transactionsPerSecond: 10,
    responseTimeVsThreads: 11,
    latencyOverTime: 12,
} as const;

/**
 * Known panel IDs for the System monitoring dashboard
 */
export const SYSTEM_DASHBOARD_PANELS = {
    cpuUsage: 1,
    memoryUsage: 2,
    diskIO: 3,
    networkIO: 4,
    loadAverage: 5,
} as const;

/**
 * Preset capture configurations
 */
export const CAPTURE_PRESETS = {
    /** Capture the most important JMeter panels for a report */
    jmeterReport: {
        panelIds: [
            JMETER_DASHBOARD_PANELS.responseTimesOverTime,
            JMETER_DASHBOARD_PANELS.activeThreadsOverTime,
            JMETER_DASHBOARD_PANELS.throughputOverTime,
            JMETER_DASHBOARD_PANELS.errorsOverTime,
            JMETER_DASHBOARD_PANELS.responseTimePercentiles,
            JMETER_DASHBOARD_PANELS.transactionsPerSecond,
        ],
        width: 1200,
        height: 600,
        theme: 'light' as const,
    },

    /** Capture system monitoring panels */
    systemReport: {
        panelIds: [
            SYSTEM_DASHBOARD_PANELS.cpuUsage,
            SYSTEM_DASHBOARD_PANELS.memoryUsage,
            SYSTEM_DASHBOARD_PANELS.diskIO,
            SYSTEM_DASHBOARD_PANELS.networkIO,
        ],
        width: 1200,
        height: 400,
        theme: 'light' as const,
    },

    /** Capture all panels at high resolution */
    fullCapture: {
        width: 1600,
        height: 800,
        theme: 'light' as const,
    },
} as const;
