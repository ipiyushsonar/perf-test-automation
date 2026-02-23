// ============================================
// Confluence Client Types
// ============================================

export interface ConfluenceConfig {
    url: string;
    username: string;
    apiToken: string;
    spaceKey: string;
    parentPageId?: string;
}

export interface ConfluenceSpace {
    id: number;
    key: string;
    name: string;
    type: string;
    status: string;
}

export interface ConfluencePage {
    id: string;
    type: string;
    status: string;
    title: string;
    version: {
        number: number;
    };
    _links: {
        webui: string;
        self: string;
    };
}

export interface ConfluenceAttachment {
    id: string;
    title: string;
    mediaType: string;
    fileSize: number;
    _links: {
        download: string;
        self: string;
    };
}

export interface CreatePageInput {
    spaceKey: string;
    title: string;
    body: string;
    parentId?: string;
}

export interface UpdatePageInput {
    id: string;
    title: string;
    body: string;
    version: number;
}

export interface PublishOptions {
    reportId: number;
    reportName: string;
    spaceKey?: string;
    parentPageId?: string;
    excelFilePath?: string;
    htmlFilePath?: string;
    grafanaImagePaths?: string[];
    reportHtml?: string;
}

export interface PublishResult {
    pageId: string;
    pageUrl: string;
    attachmentCount: number;
}
