// ============================================
// Grafana HTTP API Client
// ============================================

import type {
    GrafanaConfig,
    GrafanaDashboard,
    GrafanaDashboardDetail,
    GrafanaHealthResponse,
} from './types';

export class GrafanaClient {
    private baseUrl: string;
    private headers: Record<string, string>;

    constructor(config: GrafanaConfig) {
        this.baseUrl = config.url.replace(/\/+$/, '');
        this.headers = {
            'Authorization': `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json',
            ...(config.orgId ? { 'X-Grafana-Org-Id': String(config.orgId) } : {}),
        };
    }

    /**
     * Test connectivity to Grafana
     */
    async testConnection(): Promise<GrafanaHealthResponse> {
        const res = await fetch(`${this.baseUrl}/api/health`, {
            headers: this.headers,
        });

        if (!res.ok) {
            throw new Error(`Grafana connection failed: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<GrafanaHealthResponse>;
    }

    /**
     * List all dashboards
     */
    async listDashboards(): Promise<GrafanaDashboard[]> {
        const res = await fetch(`${this.baseUrl}/api/search?type=dash-db`, {
            headers: this.headers,
        });

        if (!res.ok) {
            throw new Error(`Failed to list dashboards: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<GrafanaDashboard[]>;
    }

    /**
     * Get dashboard details by UID
     */
    async getDashboard(uid: string): Promise<GrafanaDashboardDetail> {
        const res = await fetch(`${this.baseUrl}/api/dashboards/uid/${uid}`, {
            headers: this.headers,
        });

        if (!res.ok) {
            throw new Error(`Failed to get dashboard ${uid}: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<GrafanaDashboardDetail>;
    }

    /**
     * Render a panel as PNG image
     */
    async renderPanel(
        dashboardUid: string,
        slug: string,
        panelId: number,
        options: {
            width?: number;
            height?: number;
            from?: string;
            to?: string;
            theme?: 'light' | 'dark';
            tz?: string;
        } = {}
    ): Promise<Buffer> {
        const params = new URLSearchParams({
            panelId: String(panelId),
            width: String(options.width || 1000),
            height: String(options.height || 500),
            ...(options.from ? { from: options.from } : {}),
            ...(options.to ? { to: options.to } : {}),
            ...(options.theme ? { theme: options.theme } : {}),
            ...(options.tz ? { tz: options.tz } : {}),
        });

        const url = `${this.baseUrl}/render/d-solo/${dashboardUid}/${slug}?${params.toString()}`;

        const res = await fetch(url, {
            headers: this.headers,
        });

        if (!res.ok) {
            throw new Error(`Failed to render panel ${panelId}: ${res.status} ${res.statusText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
}
