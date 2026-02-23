// @perf-test/confluence-client - Confluence Integration

export { ConfluenceClient } from './client';
export { ConfluenceAttachments } from './attachments';
export { ConfluencePublisher } from './publisher';
export { buildTestReportPage } from './templates/test-report';
export type {
    ConfluenceConfig,
    ConfluenceSpace,
    ConfluencePage,
    ConfluenceAttachment,
    CreatePageInput,
    UpdatePageInput,
    PublishOptions,
    PublishResult,
} from './types';
