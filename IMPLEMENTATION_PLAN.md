# Performance Test Automation - Implementation Plan

## Overview

A full-stack TypeScript monorepo application for automating JMeter performance test execution, real-time monitoring, report generation, and publishing. Replaces manual test triggering, Python comparison scripts, and Java Selenium Grafana screenshot tools with a unified web application.

## Tech Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Monorepo        | Turborepo + Bun                     |
| Frontend        | Next.js 14+ (App Router) + React 18 |
| UI Library      | shadcn/ui + Tailwind CSS            |
| ORM             | Drizzle ORM                         |
| Database        | SQLite (migrateable to PostgreSQL)  |
| Real-time       | Server-Sent Events (SSE)            |
| Test Runner     | child_process / SSH2 / Jenkins API  |
| Live Metrics    | InfluxDB 1.x HTTP API              |
| Excel Reports   | ExcelJS + Chart.js (canvas)         |
| HTML Reports    | React rendered to static HTML       |
| Grafana         | Image Renderer API                  |
| Confluence      | REST API                            |
| Deployment      | Same Ubuntu EC2 as JMeter client    |

---

## Monorepo Structure

```
perf-test-automation/
├── apps/
│   └── web/                              # Next.js 14+ Full-Stack Application
│       ├── src/
│       │   ├── app/                      # App Router
│       │   │   ├── (dashboard)/
│       │   │   │   ├── page.tsx          # Dashboard home
│       │   │   │   ├── scenarios/        # Scenario management
│       │   │   │   ├── tests/            # Test execution & history
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── new/page.tsx  # Create test
│       │   │   │   │   └── [id]/
│       │   │   │   │       ├── page.tsx  # Test details
│       │   │   │   │       └── live/page.tsx  # Live aggregate report
│       │   │   │   ├── reports/          # Report viewing
│       │   │   │   ├── baselines/        # Baseline management
│       │   │   │   ├── versions/         # Version management
│       │   │   │   ├── scripts/          # JMX script management
│       │   │   │   └── settings/         # App settings
│       │   │   ├── api/                  # API Routes (Next.js)
│       │   │   │   ├── tests/
│       │   │   │   │   ├── route.ts      # List/create tests
│       │   │   │   │   ├── [id]/route.ts
│       │   │   │   │   ├── [id]/live/route.ts    # SSE endpoint
│       │   │   │   │   ├── [id]/start/route.ts   # Start test
│       │   │   │   │   └── [id]/cancel/route.ts  # Cancel test
│       │   │   │   ├── scenarios/
│       │   │   │   ├── reports/
│       │   │   │   ├── baselines/
│       │   │   │   ├── versions/
│       │   │   │   ├── scripts/
│       │   │   │   ├── confluence/
│       │   │   │   └── settings/
│       │   │   └── layout.tsx
│       │   ├── components/
│       │   │   ├── dashboard/
│       │   │   ├── test-runner/
│       │   │   ├── live-report/
│       │   │   │   ├── aggregate-table.tsx
│       │   │   │   ├── response-time-chart.tsx
│       │   │   │   ├── throughput-chart.tsx
│       │   │   │   ├── error-analysis.tsx
│       │   │   │   └── baseline-comparison.tsx
│       │   │   ├── reports/
│       │   │   └── ui/                   # shadcn/ui
│       │   ├── lib/
│       │   │   ├── api/                  # API client functions
│       │   │   ├── hooks/                # Custom React hooks
│       │   │   └── utils/
│       │   └── styles/
│       ├── public/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/
│   ├── db/                               # Database (Drizzle ORM)
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── scenarios.ts
│   │   │   │   ├── test-runs.ts
│   │   │   │   ├── test-statistics.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── baselines.ts
│   │   │   │   ├── versions.ts
│   │   │   │   ├── jmx-scripts.ts
│   │   │   │   ├── grafana-snapshots.ts
│   │   │   │   ├── schedules.ts
│   │   │   │   ├── settings.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   ├── queries/
│   │   │   │   ├── scenarios.ts
│   │   │   │   ├── tests.ts
│   │   │   │   ├── reports.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── test-runner/                      # JMeter Execution Engine
│   │   ├── src/
│   │   │   ├── runners/
│   │   │   │   ├── base.ts               # Abstract base runner
│   │   │   │   ├── local.runner.ts       # Child process execution
│   │   │   │   ├── ssh.runner.ts         # SSH2 remote execution
│   │   │   │   ├── jenkins.runner.ts     # Jenkins API integration
│   │   │   │   └── index.ts
│   │   │   ├── jmeter/
│   │   │   │   ├── script-manager.ts     # JMX file manipulation
│   │   │   │   ├── parameter-injector.ts # Replace placeholders
│   │   │   │   ├── result-parser.ts      # Parse CSV results
│   │   │   │   └── validator.ts          # Validate JMX structure
│   │   │   ├── queue/
│   │   │   │   ├── test-queue.ts         # Queue management
│   │   │   │   ├── scheduler.ts          # Sequential execution
│   │   │   │   └── cooldown.ts           # Cooldown handling
│   │   │   ├── executor.ts               # Main execution orchestrator
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── influxdb-client/                  # InfluxDB 1.x Integration
│   │   ├── src/
│   │   │   ├── client.ts                 # HTTP client for InfluxDB
│   │   │   ├── queries/
│   │   │   │   ├── transaction-metrics.ts
│   │   │   │   ├── aggregate.ts          # Per-transaction aggregations
│   │   │   │   ├── time-series.ts        # Time-based queries
│   │   │   │   └── index.ts
│   │   │   ├── parsers/
│   │   │   │   └── jmeter-schema.ts      # Parse JMeter backend listener data
│   │   │   ├── live-report.ts            # Real-time metrics aggregation
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── report-generator/                 # Report Generation
│   │   ├── src/
│   │   │   ├── parsers/
│   │   │   │   ├── jmeter-csv.ts         # Parse JMeter CSV results
│   │   │   │   ├── comparison-csv.ts     # Parse pre-aggregated comparison
│   │   │   │   └── index.ts
│   │   │   ├── statistics/
│   │   │   │   ├── calculator.ts         # Min, max, p90, p95, etc.
│   │   │   │   ├── aggregator.ts         # Aggregate multiple results
│   │   │   │   ├── baseline-compare.ts   # Baseline comparison
│   │   │   │   └── regression.ts         # Regression detection
│   │   │   ├── excel/
│   │   │   │   ├── workbook.ts           # ExcelJS workbook builder
│   │   │   │   ├── comparison-sheet.ts   # Version comparison table
│   │   │   │   ├── charts.ts             # Chart.js -> Canvas -> Excel
│   │   │   │   └── styles.ts             # Cell styles, formatting
│   │   │   ├── html/
│   │   │   │   ├── templates/
│   │   │   │   │   └── report.tsx        # React template for HTML
│   │   │   │   ├── generator.ts          # Render to static HTML
│   │   │   │   └── charts.ts             # SVG charts for HTML
│   │   │   ├── thresholds/
│   │   │   │   ├── config.ts             # Threshold configuration
│   │   │   │   ├── evaluator.ts          # Check thresholds
│   │   │   │   └── severity.ts           # Severity levels
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── grafana-client/                   # Grafana Integration
│   │   ├── src/
│   │   │   ├── client.ts                 # Grafana HTTP API client
│   │   │   ├── renderer.ts               # Image renderer (/render endpoint)
│   │   │   ├── dashboard.ts              # Dashboard operations
│   │   │   ├── presets.ts                # Panel ID mappings
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── confluence-client/                # Confluence Integration
│   │   ├── src/
│   │   │   ├── client.ts                 # Confluence REST API client
│   │   │   ├── templates/
│   │   │   │   └── test-report.ts        # Page templates
│   │   │   ├── publisher.ts              # Publish pages, attach files
│   │   │   ├── attachments.ts            # File attachment handling
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── types/                            # Shared TypeScript Types
│   │   ├── src/
│   │   │   ├── test.ts                   # Test-related types
│   │   │   ├── scenario.ts               # Scenario types
│   │   │   ├── report.ts                 # Report types
│   │   │   ├── metrics.ts                # Metrics types
│   │   │   ├── runner.ts                 # Runner config types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── ui/                               # Shared UI Components
│       ├── src/
│       │   ├── components/
│       │   │   ├── data-table/
│       │   │   ├── charts/
│       │   │   ├── forms/
│       │   │   └── layout/
│       │   └── index.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── data/                                 # Data Storage (gitignored)
│   ├── db/                               # SQLite database files
│   ├── jmeter-scripts/                   # JMX files
│   │   ├── default/
│   │   │   ├── prod-rev-trans.jmx
│   │   │   └── uid.jmx
│   │   └── uploads/
│   ├── results/                          # Test result CSVs
│   ├── reports/                          # Generated reports
│   │   ├── excel/
│   │   └── html/
│   └── grafana-snapshots/                # Captured images
│
├── docs/                                 # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── turbo.json
├── bunfig.toml
├── package.json
├── .env.example
└── README.md
```

---

## Database Schema (Drizzle ORM)

### Scenarios

```typescript
export const scenarios = sqliteTable('scenarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),           // 'prod', 'rev', 'trans', 'uid'
  displayName: text('display_name').notNull(),
  description: text('description'),
  testType: text('test_type').notNull(),           // 'combined' | 'standalone'

  // Default test parameters
  loadUserCount: integer('load_user_count'),       // 25 for prod/rev/trans, 22 for uid
  stressUserCount: integer('stress_user_count'),   // 50 for prod/rev/trans, 44 for uid
  durationMinutes: integer('duration_minutes').default(60),
  rampUpSeconds: integer('ramp_up_seconds').default(60),
  cooldownSeconds: integer('cooldown_seconds').default(900), // 15 min

  // JMX script reference
  defaultJmxScriptId: integer('default_jmx_script_id'),

  // Configuration
  config: text('config', { mode: 'json' }).$type<ScenarioConfig>(),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Test Types

```typescript
export const testTypes = sqliteTable('test_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),                    // 'load' | 'stress'
  displayName: text('display_name').notNull(),
  description: text('description'),
});
```

### JMX Scripts

```typescript
export const jmxScripts = sqliteTable('jmx_scripts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  checksum: text('checksum'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  scenarioId: integer('scenario_id'),
  uploadedBy: text('uploaded_by'),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Versions

```typescript
export const versions = sqliteTable('versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  version: text('version').notNull().unique(),     // '14.2.2'
  displayName: text('display_name'),
  releaseDate: integer('release_date', { mode: 'timestamp' }),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Test Runs

```typescript
export const testRuns = sqliteTable('test_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),

  // References
  scenarioId: integer('scenario_id').notNull(),
  testTypeId: integer('test_type_id').notNull(),
  versionId: integer('version_id').notNull(),
  jmxScriptId: integer('jmx_script_id').notNull(),
  baselineId: integer('baseline_id'),

  // Execution config
  runnerType: text('runner_type').notNull(),       // 'local' | 'ssh' | 'jenkins'
  runnerConfig: text('runner_config', { mode: 'json' }).$type<RunnerConfig>(),

  // Test parameters (actual values used)
  userCount: integer('user_count').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  rampUpSeconds: integer('ramp_up_seconds'),

  // Status tracking
  status: text('status').notNull().default('pending'),
  progress: integer('progress').default(0),
  currentPhase: text('current_phase'),

  // Timestamps
  queuedAt: integer('queued_at', { mode: 'timestamp' }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),

  // Results
  resultFile: text('result_file'),
  jmeterLog: text('jmeter_log'),
  errorLog: text('error_log'),
  exitCode: integer('exit_code'),

  // Summary (denormalized for dashboard)
  totalSamples: integer('total_samples'),
  errorCount: integer('error_count'),
  errorPercent: real('error_percent'),
  averageResponseTime: real('average_response_time'),
  p90ResponseTime: real('p90_response_time'),
  p95ResponseTime: real('p95_response_time'),
  throughput: real('throughput'),

  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by'),
});
```

### Test Statistics (Per-Transaction)

```typescript
export const testStatistics = sqliteTable('test_statistics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  testRunId: integer('test_run_id').notNull(),

  transactionName: text('transaction_name').notNull(),
  transactionLabel: text('transaction_label'),

  sampleCount: integer('sample_count').notNull(),
  errorCount: integer('error_count').notNull(),
  errorPercent: real('error_percent'),

  // Response times (ms)
  min: integer('min'),
  max: integer('max'),
  mean: integer('mean'),
  median: integer('median'),
  stdDev: real('std_dev'),
  p90: integer('p90'),
  p95: integer('p95'),
  p99: integer('p99'),

  // Throughput
  throughput: real('throughput'),
  receivedKbPerSec: real('received_kb_per_sec'),
  sentKbPerSec: real('sent_kb_per_sec'),

  // Status
  status: text('status'),
  regressionSeverity: text('regression_severity'),

  // Baseline comparison
  baselineP90: integer('baseline_p90'),
  p90ChangePercent: real('p90_change_percent'),

  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Baselines

```typescript
export const baselines = sqliteTable('baselines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),

  scenarioId: integer('scenario_id'),
  testTypeId: integer('test_type_id'),
  versionId: integer('version_id'),
  sourceTestRunId: integer('source_test_run_id'),

  metrics: text('metrics', { mode: 'json' }).$type<BaselineMetric[]>(),

  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Reports

```typescript
export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),                    // 'comparison' | 'single' | 'baseline'

  testRunIds: text('test_run_ids', { mode: 'json' }).$type<number[]>(),

  currentVersionId: integer('current_version_id'),
  previousVersionId: integer('previous_version_id'),
  baselineId: integer('baseline_id'),

  // Output files
  excelFilePath: text('excel_file_path'),
  htmlFilePath: text('html_file_path'),
  htmlHostedUrl: text('html_hosted_url'),

  // Summary
  totalTransactions: integer('total_transactions'),
  improvedCount: integer('improved_count'),
  degradedCount: integer('degraded_count'),
  criticalCount: integer('critical_count'),
  overallStatus: text('overall_status'),

  // Confluence
  confluencePublished: integer('confluence_published', { mode: 'boolean' }).default(false),
  confluencePageId: text('confluence_page_id'),
  confluenceUrl: text('confluence_url'),
  autoPublishConfluence: integer('auto_publish_confluence', { mode: 'boolean' }).default(false),

  status: text('status').default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Grafana Snapshots

```typescript
export const grafanaSnapshots = sqliteTable('grafana_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id'),
  testRunId: integer('test_run_id'),

  dashboardUid: text('dashboard_uid'),
  dashboardName: text('dashboard_name'),
  panelId: integer('panel_id'),
  panelTitle: text('panel_title'),

  timeFrom: integer('time_from', { mode: 'timestamp' }),
  timeTo: integer('time_to', { mode: 'timestamp' }),

  imagePath: text('image_path'),
  imageSize: integer('image_size'),

  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Schedules (Future)

```typescript
export const schedules = sqliteTable('schedules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),

  cronExpression: text('cron_expression'),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }),
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),

  scenarioId: integer('scenario_id'),
  testTypeId: integer('test_type_id'),
  versionId: integer('version_id'),
  jmxScriptId: integer('jmx_script_id'),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Settings

```typescript
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),   // 'grafana' | 'influxdb' | 'confluence' | 'runner' | 'general'
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
```

### Relations

```typescript
export const scenariosRelations = relations(scenarios, ({ one, many }) => ({
  defaultJmxScript: one(jmxScripts, {
    fields: [scenarios.defaultJmxScriptId],
    references: [jmxScripts.id],
  }),
  testRuns: many(testRuns),
}));

export const testRunsRelations = relations(testRuns, ({ one, many }) => ({
  scenario: one(scenarios, { fields: [testRuns.scenarioId], references: [scenarios.id] }),
  testType: one(testTypes, { fields: [testRuns.testTypeId], references: [testTypes.id] }),
  version: one(versions, { fields: [testRuns.versionId], references: [versions.id] }),
  jmxScript: one(jmxScripts, { fields: [testRuns.jmxScriptId], references: [jmxScripts.id] }),
  baseline: one(baselines, { fields: [testRuns.baselineId], references: [baselines.id] }),
  statistics: many(testStatistics),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  currentVersion: one(versions, { fields: [reports.currentVersionId], references: [versions.id] }),
  previousVersion: one(versions, { fields: [reports.previousVersionId], references: [versions.id] }),
  baseline: one(baselines, { fields: [reports.baselineId], references: [baselines.id] }),
  grafanaSnapshots: many(grafanaSnapshots),
}));
```

---

## API Endpoints

### Tests

```
GET    /api/tests                          # List test runs (paginated, filterable)
POST   /api/tests                          # Create test run
GET    /api/tests/:id                      # Get test run details
PUT    /api/tests/:id                      # Update test run
DELETE /api/tests/:id                      # Delete test run
POST   /api/tests/:id/start                # Start test execution
POST   /api/tests/:id/cancel               # Cancel running test
GET    /api/tests/:id/live                 # SSE: Live metrics stream
GET    /api/tests/:id/statistics           # Get test statistics
GET    /api/tests/:id/download             # Download result CSV
```

### Scenarios

```
GET    /api/scenarios                      # List scenarios
POST   /api/scenarios                      # Create scenario
GET    /api/scenarios/:id                  # Get scenario details
PUT    /api/scenarios/:id                  # Update scenario
DELETE /api/scenarios/:id                  # Delete scenario
```

### Versions

```
GET    /api/versions                       # List versions
POST   /api/versions                       # Create version
PUT    /api/versions/:id                   # Update version
DELETE /api/versions/:id                   # Delete version
```

### JMX Scripts

```
GET    /api/scripts                        # List JMX scripts
POST   /api/scripts/upload                 # Upload JMX script
GET    /api/scripts/:id                    # Get script details
PUT    /api/scripts/:id                    # Update script metadata
DELETE /api/scripts/:id                    # Delete script
GET    /api/scripts/:id/download           # Download JMX file
```

### Baselines

```
GET    /api/baselines                      # List baselines
POST   /api/baselines                      # Create baseline from test run
GET    /api/baselines/:id                  # Get baseline details
PUT    /api/baselines/:id                  # Update baseline
DELETE /api/baselines/:id                  # Delete baseline
POST   /api/baselines/:id/set-default      # Set as default baseline
```

### Reports

```
GET    /api/reports                        # List reports
POST   /api/reports/generate               # Generate new report
GET    /api/reports/:id                    # Get report details
DELETE /api/reports/:id                    # Delete report
GET    /api/reports/:id/download/excel     # Download Excel file
GET    /api/reports/:id/download/html      # Download HTML file
GET    /api/reports/:id/html               # View hosted HTML
```

### Confluence

```
GET    /api/confluence/spaces              # List Confluence spaces
POST   /api/confluence/publish/:reportId   # Publish report to Confluence
GET    /api/confluence/status/:reportId    # Check publish status
```

### Grafana

```
GET    /api/grafana/dashboards             # List available dashboards
POST   /api/grafana/capture                # Capture dashboard panels
GET    /api/grafana/test-connection        # Test Grafana connection
```

### Schedules (Future)

```
GET    /api/schedules                      # List schedules
POST   /api/schedules                      # Create schedule
PUT    /api/schedules/:id                  # Update schedule
DELETE /api/schedules/:id                  # Delete schedule
```

### Settings

```
GET    /api/settings                       # Get all settings
GET    /api/settings/:category             # Get category settings
PUT    /api/settings/:category             # Update category settings
POST   /api/settings/test-connections      # Test all configured connections
```

### Dashboard

```
GET    /api/dashboard/stats                # Dashboard statistics
GET    /api/dashboard/recent-tests         # Recent test runs
GET    /api/dashboard/trends               # Performance trends
```

---

## Features

### Current Workflow (Manual)

| Step | Action                          | Manual Work                           |
| ---- | ------------------------------- | ------------------------------------- |
| 1    | Edit JMX script                 | Enable prod, disable rev/trans        |
| 2    | Set result file name            | Change filename to reflect scenario   |
| 3    | Set user count                  | 25 for load, 50 for stress            |
| 4    | Run test                        | Click play in JMeter GUI              |
| 5    | Wait for completion             | Monitor JMeter                        |
| 6    | Wait 15 min cooldown            | Manual timer                          |
| 7    | Repeat for stress test          | Go back to step 2                     |
| 8    | Repeat for all scenarios        | Go back to step 1                     |
| 9    | Generate comparison report      | Run Python script                     |
| 10   | Capture Grafana screenshots     | Run Java Selenium script              |
| 11   | Assemble in Confluence          | Manual copy-paste + attachments       |

### Automated Workflow

| Step | Action                    | Automation                                          |
| ---- | ------------------------- | --------------------------------------------------- |
| 1    | Select scenarios + version | Web UI dropdown                                     |
| 2    | Click "Run All Tests"     | Queue: prod-load, prod-stress, rev-load, ... (auto) |
| 3    | Monitor live progress     | Real-time aggregate table from InfluxDB              |
| 4    | Auto-generate reports     | Comparison Excel + HTML on completion                |
| 5    | Auto-capture Grafana      | API-based screenshot capture                         |
| 6    | Publish to Confluence     | One-click or auto-publish                            |

### Feature List

#### Test Execution
- [x] Local JMeter runner (child_process)
- [x] SSH remote runner (SSH2 library)
- [x] Jenkins runner (REST API)
- [x] JMX script upload and management
- [x] Test queue with sequential execution
- [x] Configurable cooldown between tests
- [x] Auto result file naming: `{scenario}_{type}_{version}_{timestamp}.csv`

#### Live Monitoring
- [x] Per-transaction aggregate table (from InfluxDB)
- [x] Real-time response time charts
- [x] Real-time throughput charts
- [x] Error analysis and grouping
- [x] Baseline comparison during test

#### Report Generation
- [x] Version comparison Excel (ExcelJS + Chart.js)
- [x] Self-contained HTML reports
- [x] Hosted HTML reports (shareable URL)
- [x] Regression detection with configurable thresholds
- [x] Grafana dashboard panel capture (API-based)

#### Integrations
- [x] Confluence publishing (manual + auto)
- [x] InfluxDB 1.x for live metrics
- [x] Grafana Image Renderer API

#### Management
- [x] Scenario configuration (prod/rev/trans/uid)
- [x] Version tracking across releases
- [x] Baseline management and comparison
- [x] Test history with filtering and search
- [x] Settings management (all integrations)

#### Future
- [ ] Test scheduling (cron-based)
- [ ] CI/CD integration (REST API + webhooks)
- [ ] Confluence auto-publish on completion

---

## Remote JMeter Execution

### Architecture: SSH Runner

The SSH runner handles scenarios where the web app and JMeter client are on different machines.

```
┌─────────────────────┐         SSH         ┌─────────────────────┐
│  Web App (EC2-A)    │ ────────────────────>│  JMeter Client      │
│                     │                      │  (EC2-B)            │
│  - Next.js          │  1. Upload JMX       │                     │
│  - API Routes       │  2. Execute JMeter   │  - JMeter 5.x       │
│  - SQLite           │  3. Stream logs      │  - Java 11+         │
│  - Report Gen       │  4. Fetch results    │  - InfluxDB Writer  │
│                     │                      │                     │
└─────────────────────┘                      └─────────────────────┘
         │                                            │
         │       ┌──────────────────────┐             │
         └──────>│  InfluxDB            │<────────────┘
                 │  (Shared/Accessible) │  JMeter Backend
                 └──────────────────────┘  Listener writes
```

### Execution Flow

```
1. Upload Phase
   Web App ──SCP──> JMeter Client: /opt/jmeter/scripts/{script}.jmx

2. Execute Phase
   Web App ──SSH──> JMeter Client: jmeter -n -t script.jmx -l results.csv -j jmeter.log

3. Monitor Phase
   Web App ──SSH──> JMeter Client: tail -f jmeter.log (stream via SSE)
   Web App ──HTTP──> InfluxDB: Query per-transaction metrics (live aggregate)

4. Collect Phase
   Web App <──SCP── JMeter Client: results.csv, jmeter.log

5. Cleanup Phase
   Web App ──SSH──> JMeter Client: rm script.jmx results.csv (optional)
```

### Runner Implementations

#### Local Runner
```typescript
// Direct child_process execution on same machine
class LocalRunner extends BaseRunner {
  async execute(config: TestConfig): AsyncGenerator<ProgressEvent> {
    const proc = spawn('jmeter', [
      '-n',
      '-t', config.scriptPath,
      '-l', config.resultPath,
      '-j', config.logPath,
      '-Jthreads=' + config.userCount,
      '-Jduration=' + config.durationSeconds,
      '-Jrampup=' + config.rampUpSeconds,
    ]);
    // Stream stdout/stderr as progress events
  }
}
```

#### SSH Runner
```typescript
// Remote execution via SSH2
class SshRunner extends BaseRunner {
  async execute(config: TestConfig): AsyncGenerator<ProgressEvent> {
    // 1. Connect via SSH
    // 2. Upload JMX via SFTP
    // 3. Execute JMeter command
    // 4. Stream log output
    // 5. Download results via SFTP
    // 6. Optional cleanup
  }
}
```

#### Jenkins Runner
```typescript
// Trigger via Jenkins REST API
class JenkinsRunner extends BaseRunner {
  async execute(config: TestConfig): AsyncGenerator<ProgressEvent> {
    // 1. Trigger Jenkins job with parameters
    // 2. Poll build status
    // 3. Stream console output
    // 4. Fetch artifacts (results CSV)
  }
}
```

---

## Implementation Phases (Parallel Development)

### Track A: Core Infrastructure (Week 1-2)

| Task                                    | Duration |
| --------------------------------------- | -------- |
| Initialize Turborepo monorepo           | 0.5 day  |
| Set up apps/web (Next.js)               | 0.5 day  |
| Set up packages/db (Drizzle)            | 1 day    |
| Create database schema & migrations     | 1 day    |
| Base UI layout with navigation          | 1 day    |
| Settings management (Grafana, InfluxDB) | 1 day    |

### Track B: Test Runner (Week 1-2)

| Task                           | Duration |
| ------------------------------ | -------- |
| packages/test-runner structure | 0.5 day  |
| Local JMeter runner            | 1.5 days |
| JMX script management & upload | 1 day    |
| Test queue with cooldown       | 1 day    |
| SSH runner                     | 1.5 days |
| Jenkins runner                 | 1.5 days |

### Track C: Live Reporting (Week 2-3)

| Task                             | Duration |
| -------------------------------- | -------- |
| packages/influxdb-client         | 1.5 days |
| Per-transaction metrics queries  | 1 day    |
| SSE endpoint for live updates    | 1 day    |
| Live aggregate table component   | 1 day    |
| Live response time charts        | 1 day    |
| Baseline comparison in live view | 1 day    |

### Track D: Report Generation (Week 3-4)

| Task                                | Duration |
| ----------------------------------- | -------- |
| packages/report-generator structure | 0.5 day  |
| JMeter CSV parser                   | 1 day    |
| Statistics calculator               | 1 day    |
| ExcelJS workbook builder            | 1.5 days |
| Chart.js -> Canvas -> Excel         | 1.5 days |
| HTML report generator               | 1.5 days |
| Regression detection                | 1 day    |

### Track E: Integrations (Week 4-5)

| Task                               | Duration |
| ---------------------------------- | -------- |
| packages/grafana-client            | 1.5 days |
| Dashboard/panel image capture      | 1 day    |
| packages/confluence-client         | 1.5 days |
| Report publishing with attachments | 1.5 days |
| Confluence template support        | 1 day    |

### Track F: UI & Polish (Week 5-6)

| Task                           | Duration |
| ------------------------------ | -------- |
| Scenario management UI         | 1 day    |
| Test creation wizard           | 1.5 days |
| Test history & details pages   | 1 day    |
| Report viewing UI              | 1 day    |
| Baseline management UI         | 1 day    |
| Dashboard enhancements         | 1 day    |
| Error handling & notifications | 1 day    |

### Track G: Future Features (Week 7+)

| Task                                     | Duration |
| ---------------------------------------- | -------- |
| Test scheduling                          | 2 days   |
| CI/CD integration (webhooks, API tokens) | 1.5 days |
| Confluence auto-publish                  | 1 day    |

---

## Environment Configuration

```bash
# .env.example

# ============================================
# Database
# ============================================
DATABASE_URL="sqlite:///./data/db/perf-test.db"

# ============================================
# InfluxDB (for live metrics)
# ============================================
INFLUXDB_URL="http://localhost:8086"
INFLUXDB_DATABASE="jmeter"
INFLUXDB_USERNAME="admin"
INFLUXDB_PASSWORD="password"

# ============================================
# Grafana
# ============================================
GRAFANA_URL="http://localhost:3000"
GRAFANA_API_TOKEN="glsa_xxxxx"
GRAFANA_SYSTEM_DASHBOARD_UID="000000128"
GRAFANA_JMETER_DASHBOARD_UID="0WvXRHHMk"

# ============================================
# Confluence
# ============================================
CONFLUENCE_URL="https://your-company.atlassian.net/wiki"
CONFLUENCE_USERNAME="user@company.com"
CONFLUENCE_API_TOKEN="your-api-token"
CONFLUENCE_SPACE_KEY="PERF"
CONFLUENCE_PARENT_PAGE_ID="123456789"

# ============================================
# JMeter (Local Runner)
# ============================================
JMETER_PATH="/usr/bin/jmeter"
JMETER_HOME="/opt/jmeter"

# ============================================
# SSH Runner (optional)
# ============================================
SSH_HOST="10.11.32.244"
SSH_PORT=22
SSH_USERNAME="jmeter"
SSH_PRIVATE_KEY_PATH="~/.ssh/id_rsa"

# ============================================
# Jenkins Runner (optional)
# ============================================
JENKINS_URL="http://jenkins.company.com"
JENKINS_USERNAME="ci-user"
JENKINS_API_TOKEN="your-jenkins-token"
JENKINS_JOB_NAME="performance-test"

# ============================================
# File Paths
# ============================================
DATA_DIR="./data"
JMETER_SCRIPTS_DIR="./data/jmeter-scripts"
RESULTS_DIR="./data/results"
REPORTS_DIR="./data/reports"
```

---

## Key Design Decisions

| Area                  | Decision                                                     | Rationale                                     |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| ORM                   | Drizzle ORM with SQLite                                      | Type-safe, migrateable to PostgreSQL          |
| JMeter Execution      | child_process.spawn for local, SSH2 for remote               | Flexibility for all deployment scenarios      |
| JMX Manipulation      | String-based placeholder replacement                         | Simple, works with any JMX structure          |
| Live Metrics          | Query InfluxDB 1.x via HTTP API                              | Reuses existing infrastructure                |
| Real-time Updates     | Server-Sent Events (SSE)                                     | Simpler than WebSocket for one-way updates    |
| Excel Generation      | ExcelJS + Chart.js (canvas) -> embedded images               | Pure TypeScript, no external dependencies     |
| HTML Reports          | React components rendered to static HTML                     | Reuse UI components, consistent styling       |
| Grafana Integration   | Image Renderer API (/render endpoint)                        | No Selenium needed                            |
| Confluence Publishing | REST API with attachment handling                            | Direct integration, no MCP dependency         |
| File Storage          | Local filesystem with DB references                          | Easy backup, simple deployment on EC2         |
| Test Queue            | In-memory queue with SQLite persistence                      | Simple, restartable, no external queue needed |

---

## Deprecations

| Old Tool                  | New Implementation                               |
| ------------------------- | ------------------------------------------------ |
| Python comparison.py      | `@perf-test/report-generator` (TypeScript)       |
| Java Selenium (Grafana)   | `@perf-test/grafana-client` (Grafana API)        |
| Manual JMX editing        | `@perf-test/test-runner` (script management)     |
| Manual test triggering    | Web UI with queue management                     |
| Manual result naming      | Auto-generated: `{scenario}_{type}_{ver}_{ts}.csv` |
| Manual Confluence publish | One-click or auto-publish from web UI            |

---

## Reference

This implementation replaces and consolidates:
- **perf-report-gen** Python project (report generation, Grafana, Confluence)
- **Manual JMeter workflow** (script editing, test execution, result collection)
- **Java Selenium Grafana screenshot tool** (replaced by Grafana API)
- **Manual Confluence publishing** (replaced by REST API integration)
