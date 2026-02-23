// @perf-test/grafana-client - Grafana Integration

export { GrafanaClient } from './client';
export { GrafanaRenderer } from './renderer';
export { DashboardManager } from './dashboard';
export { JMETER_DASHBOARD_PANELS, SYSTEM_DASHBOARD_PANELS, CAPTURE_PRESETS } from './presets';
export type {
    GrafanaConfig,
    GrafanaDashboard,
    GrafanaDashboardDetail,
    GrafanaPanel,
    RenderPanelOptions,
    CaptureResult,
    GrafanaHealthResponse,
} from './types';
