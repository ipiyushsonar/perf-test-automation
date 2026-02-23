// ============================================
// Grafana Panel Image Renderer
// ============================================

import { GrafanaClient } from './client';
import type {
    GrafanaConfig,
    RenderPanelOptions,
    CaptureResult,
    GrafanaDashboardDetail,
} from './types';

export class GrafanaRenderer {
    private client: GrafanaClient;

    constructor(config: GrafanaConfig) {
        this.client = new GrafanaClient(config);
    }

    /**
     * Render a single panel as PNG
     */
    async renderPanel(options: RenderPanelOptions): Promise<Buffer> {
        const dashboard = await this.client.getDashboard(options.dashboardUid);
        const slug = dashboard.meta.slug;

        return this.client.renderPanel(
            options.dashboardUid,
            slug,
            options.panelId,
            {
                width: options.width,
                height: options.height,
                from: options.from,
                to: options.to,
                theme: options.theme,
                tz: options.tz,
            }
        );
    }

    /**
     * Capture multiple panels from a dashboard
     */
    async captureAllPanels(
        dashboardUid: string,
        options: {
            from?: string;
            to?: string;
            width?: number;
            height?: number;
            theme?: 'light' | 'dark';
            panelIds?: number[];
        } = {}
    ): Promise<CaptureResult[]> {
        const dashboard = await this.client.getDashboard(dashboardUid);
        const slug = dashboard.meta.slug;
        const panels = dashboard.dashboard.panels;

        const targetPanels = options.panelIds
            ? panels.filter((p) => options.panelIds!.includes(p.id))
            : panels;

        const results: CaptureResult[] = [];

        for (const panel of targetPanels) {
            try {
                const width = options.width || 1000;
                const height = options.height || 500;

                const imageBuffer = await this.client.renderPanel(
                    dashboardUid,
                    slug,
                    panel.id,
                    {
                        width,
                        height,
                        from: options.from,
                        to: options.to,
                        theme: options.theme,
                    }
                );

                results.push({
                    panelId: panel.id,
                    panelTitle: panel.title,
                    dashboardUid,
                    dashboardName: dashboard.dashboard.title,
                    imageBuffer,
                    width,
                    height,
                });
            } catch (error) {
                console.error(`Failed to capture panel ${panel.id} (${panel.title}):`, error);
                // Continue with other panels on failure
            }
        }

        return results;
    }

    /**
     * Get dashboard details (useful for UI listing panels)
     */
    async getDashboardPanels(dashboardUid: string): Promise<GrafanaDashboardDetail> {
        return this.client.getDashboard(dashboardUid);
    }
}
