// ============================================
// Confluence Report Publisher
// ============================================

import { ConfluenceClient } from './client';
import { ConfluenceAttachments } from './attachments';
import { buildTestReportPage } from './templates/test-report';
import { basename } from 'path';
import type { ConfluenceConfig, PublishOptions, PublishResult } from './types';

export class ConfluencePublisher {
    private client: ConfluenceClient;
    private attachments: ConfluenceAttachments;
    private config: ConfluenceConfig;

    constructor(config: ConfluenceConfig) {
        this.config = config;
        this.client = new ConfluenceClient(config);
        this.attachments = new ConfluenceAttachments(config);
    }

    /**
     * Publish a report to Confluence
     * Creates or updates the page and attaches files.
     */
    async publishReport(options: PublishOptions): Promise<PublishResult> {
        const spaceKey = options.spaceKey || this.config.spaceKey;
        const parentPageId = options.parentPageId || this.config.parentPageId;

        const pageTitle = options.reportName;

        // Build page body
        const pageBody = options.reportHtml || buildTestReportPage({
            reportName: options.reportName,
            testDate: new Date().toISOString().split('T')[0],
            grafanaImageFileNames: options.grafanaImagePaths?.map((p) => basename(p)),
        });

        // Check if page already exists
        const existingPage = await this.client.findPageByTitle(spaceKey, pageTitle);

        let page;
        if (existingPage) {
            page = await this.client.updatePage({
                id: existingPage.id,
                title: pageTitle,
                body: pageBody,
                version: existingPage.version.number + 1,
            });
        } else {
            page = await this.client.createPage({
                spaceKey,
                title: pageTitle,
                body: pageBody,
                parentId: parentPageId,
            });
        }

        // Upload attachments
        let attachmentCount = 0;
        const filesToAttach: string[] = [];

        if (options.excelFilePath) {
            filesToAttach.push(options.excelFilePath);
        }
        if (options.htmlFilePath) {
            filesToAttach.push(options.htmlFilePath);
        }
        if (options.grafanaImagePaths) {
            filesToAttach.push(...options.grafanaImagePaths);
        }

        if (filesToAttach.length > 0) {
            const uploaded = await this.attachments.uploadAttachments(page.id, filesToAttach);
            attachmentCount = uploaded.length;
        }

        const pageUrl = `${this.config.url}${page._links.webui}`;

        return {
            pageId: page.id,
            pageUrl,
            attachmentCount,
        };
    }

    /**
     * Test the Confluence connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.client.testConnection(this.config.spaceKey);
            return true;
        } catch {
            return false;
        }
    }
}
