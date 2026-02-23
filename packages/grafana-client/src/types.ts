// ============================================
// Grafana Client Types
// ============================================

export interface GrafanaConfig {
    url: string;
    apiToken: string;
    orgId?: number;
}

export interface GrafanaDashboard {
    id: number;
    uid: string;
    title: string;
    url: string;
    type: string;
    tags: string[];
    isStarred: boolean;
}

export interface GrafanaPanel {
    id: number;
    title: string;
    type: string;
    gridPos: {
        h: number;
        w: number;
        x: number;
        y: number;
    };
}

export interface GrafanaDashboardDetail {
    dashboard: {
        id: number;
        uid: string;
        title: string;
        panels: GrafanaPanel[];
    };
    meta: {
        slug: string;
        url: string;
    };
}

export interface RenderPanelOptions {
    dashboardUid: string;
    panelId: number;
    width?: number;
    height?: number;
    from?: string;   // epoch ms or relative (e.g. 'now-1h')
    to?: string;     // epoch ms or relative
    theme?: 'light' | 'dark';
    tz?: string;
}

export interface CaptureResult {
    panelId: number;
    panelTitle: string;
    dashboardUid: string;
    dashboardName: string;
    imageBuffer: Buffer;
    width: number;
    height: number;
}

export interface GrafanaHealthResponse {
    commit: string;
    database: string;
    version: string;
}
