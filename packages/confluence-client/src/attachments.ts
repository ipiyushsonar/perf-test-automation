// ============================================
// Confluence Attachment Handling
// ============================================

import { readFile } from 'fs/promises';
import { basename } from 'path';
import type { ConfluenceConfig, ConfluenceAttachment } from './types';

export class ConfluenceAttachments {
    private baseUrl: string;
    private authHeader: string;

    constructor(config: ConfluenceConfig) {
        this.baseUrl = config.url.replace(/\/+$/, '');
        const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
        this.authHeader = `Basic ${auth}`;
    }

    /**
     * List attachments for a page
     */
    async listAttachments(pageId: string): Promise<ConfluenceAttachment[]> {
        const res = await fetch(
            `${this.baseUrl}/rest/api/content/${pageId}/child/attachment`,
            {
                headers: {
                    'Authorization': this.authHeader,
                    'Accept': 'application/json',
                },
            }
        );

        if (!res.ok) {
            throw new Error(`Failed to list attachments: ${res.status} ${res.statusText}`);
        }

        const data = await res.json() as { results: ConfluenceAttachment[] };
        return data.results;
    }

    /**
     * Upload a file as an attachment to a page
     */
    async uploadAttachment(
        pageId: string,
        filePath: string,
        fileName?: string
    ): Promise<ConfluenceAttachment> {
        const fileBuffer = await readFile(filePath);
        const name = fileName || basename(filePath);

        // Determine content type from extension
        const contentType = this.getContentType(name);

        // Use the FormData API available in Node 18+
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: contentType });
        formData.append('file', blob, name);

        const res = await fetch(
            `${this.baseUrl}/rest/api/content/${pageId}/child/attachment`,
            {
                method: 'POST',
                headers: {
                    'Authorization': this.authHeader,
                    'X-Atlassian-Token': 'nocheck',
                },
                body: formData,
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to upload attachment: ${res.status} ${errText}`);
        }

        const data = await res.json() as { results: ConfluenceAttachment[] };
        return data.results[0];
    }

    /**
     * Upload multiple attachments
     */
    async uploadAttachments(
        pageId: string,
        filePaths: string[]
    ): Promise<ConfluenceAttachment[]> {
        const results: ConfluenceAttachment[] = [];

        for (const filePath of filePaths) {
            try {
                const attachment = await this.uploadAttachment(pageId, filePath);
                results.push(attachment);
            } catch (error) {
                console.error(`Failed to upload ${filePath}:`, error);
            }
        }

        return results;
    }

    private getContentType(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const types: Record<string, string> = {
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'html': 'text/html',
            'htm': 'text/html',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'csv': 'text/csv',
            'json': 'application/json',
        };
        return types[ext || ''] || 'application/octet-stream';
    }
}
