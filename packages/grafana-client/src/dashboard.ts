// ============================================
// Dashboard Manager - High-level Operations
// ============================================

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { GrafanaRenderer } from './renderer';
import type { GrafanaConfig, CaptureResult } from './types';

export class DashboardManager {
    private renderer: GrafanaRenderer;

    constructor(config: GrafanaConfig) {
        this.renderer = new GrafanaRenderer(config);
    }

    /**
     * Capture all panels from a dashboard and save to disk
     */
    async captureAndSave(
        dashboardUid: string,
        outputDir: string,
        options: {
            from?: string;
            to?: string;
            width?: number;
            height?: number;
            theme?: 'light' | 'dark';
            panelIds?: number[];
            fileNamePrefix?: string;
        } = {}
    ): Promise<Array<{ panelId: number; panelTitle: string; filePath: string; imageSize: number }>> {
        const captures = await this.renderer.captureAllPanels(dashboardUid, options);

        await mkdir(outputDir, { recursive: true });

        const results: Array<{
            panelId: number;
            panelTitle: string;
            filePath: string;
            imageSize: number;
        }> = [];

        for (const capture of captures) {
            const sanitizedTitle = capture.panelTitle
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .toLowerCase();

            const prefix = options.fileNamePrefix || capture.dashboardUid;
            const fileName = `${prefix}_panel_${capture.panelId}_${sanitizedTitle}.png`;
            const filePath = join(outputDir, fileName);

            await writeFile(filePath, capture.imageBuffer);

            results.push({
                panelId: capture.panelId,
                panelTitle: capture.panelTitle,
                filePath,
                imageSize: capture.imageBuffer.length,
            });
        }

        return results;
    }

    /**
     * Save a single panel image buffer to disk
     */
    async savePanelImage(buffer: Buffer, destPath: string): Promise<void> {
        await mkdir(dirname(destPath), { recursive: true });
        await writeFile(destPath, buffer);
    }
}
