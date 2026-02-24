// ============================================
// Confluence REST API Client
// ============================================

import type {
    ConfluenceConfig,
    ConfluencePage,
    ConfluenceSpace,
    CreatePageInput,
    UpdatePageInput,
} from './types';

export class ConfluenceClient {
    private baseUrl: string;
    private headers: Record<string, string>;

    constructor(config: ConfluenceConfig) {
        this.baseUrl = config.url.replace(/\/+$/, '');
        const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
        this.headers = {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }

    /**
     * Test connectivity to Confluence
     */
    async testConnection(spaceKey: string): Promise<ConfluenceSpace> {
        const res = await fetch(
            `${this.baseUrl}/rest/api/space/${spaceKey}`,
            { headers: this.headers }
        );

        if (!res.ok) {
            throw new Error(`Confluence connection failed: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<ConfluenceSpace>;
    }

    /**
     * List available spaces
     */
    async getSpaces(): Promise<ConfluenceSpace[]> {
        const res = await fetch(
            `${this.baseUrl}/rest/api/space?limit=50`,
            { headers: this.headers }
        );

        if (!res.ok) {
            throw new Error(`Failed to list spaces: ${res.status} ${res.statusText}`);
        }

        const data = await res.json() as { results: ConfluenceSpace[] };
        return data.results;
    }

    /**
     * Get a page by ID
     */
    async getPage(id: string): Promise<ConfluencePage> {
        const res = await fetch(
            `${this.baseUrl}/rest/api/content/${id}?expand=version`,
            { headers: this.headers }
        );

        if (!res.ok) {
            throw new Error(`Failed to get page ${id}: ${res.status} ${res.statusText}`);
        }

        return res.json() as Promise<ConfluencePage>;
    }

    /**
     * Create a new page
     */
    async createPage(input: CreatePageInput): Promise<ConfluencePage> {
        const body: Record<string, unknown> = {
            type: 'page',
            title: input.title,
            space: { key: input.spaceKey },
            body: {
                storage: {
                    value: input.body,
                    representation: 'storage',
                },
            },
        };

        if (input.parentId) {
            body.ancestors = [{ id: input.parentId }];
        }

        const res = await fetch(
            `${this.baseUrl}/rest/api/content`,
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(body),
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to create page: ${res.status} ${errText}`);
        }

        return res.json() as Promise<ConfluencePage>;
    }

    /**
     * Update an existing page
     */
    async updatePage(input: UpdatePageInput): Promise<ConfluencePage> {
        const body = {
            type: 'page',
            title: input.title,
            version: { number: input.version },
            body: {
                storage: {
                    value: input.body,
                    representation: 'storage',
                },
            },
        };

        const res = await fetch(
            `${this.baseUrl}/rest/api/content/${input.id}`,
            {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(body),
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to update page: ${res.status} ${errText}`);
        }

        return res.json() as Promise<ConfluencePage>;
    }

    /**
     * Search for a page by title in a space
     */
    async findPageByTitle(spaceKey: string, title: string): Promise<ConfluencePage | null> {
        const cql = encodeURIComponent(`space="${spaceKey}" AND title="${title}" AND type=page`);
        const res = await fetch(
            `${this.baseUrl}/rest/api/content/search?cql=${cql}&expand=version`,
            { headers: this.headers }
        );

        if (!res.ok) {
            throw new Error(`Search failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json() as { results: ConfluencePage[] };
        return data.results.length > 0 ? data.results[0] : null;
    }
}
