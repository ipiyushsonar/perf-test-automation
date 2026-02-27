# Perf-Test-Automation

A full-stack application for automating JMeter performance test execution, live monitoring, reporting, and publishing. Built as a monorepo with Next.js, Drizzle ORM, and modular packages.

## Architecture

```
perf-test-automation/
├── apps/web/            # Next.js 15 full-stack app (UI + API routes)
├── packages/
│   ├── db/              # Drizzle ORM schema, migrations, seed data (SQLite)
│   ├── test-runner/     # JMeter execution engine (local, SSH, Jenkins)
│   ├── influxdb-client/ # Live metrics from InfluxDB during test runs
│   ├── report-generator/# Excel/HTML report generation + regression detection
│   ├── grafana-client/  # Grafana dashboard screenshot capture
│   ├── confluence-client/# Publish reports to Confluence wiki
│   └── types/           # Shared TypeScript types
├── turbo.json           # Turborepo task configuration
└── package.json         # Root workspace configuration
```

## Prerequisites

- **Bun** ≥ 1.0 (package manager & runtime)
- **Node.js** ≥ 18 (for Next.js)
- **JMeter** (for running performance tests)

Optional integrations:
- InfluxDB (live test metrics)
- Grafana (dashboard screenshots)
- Confluence (report publishing)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd perf-test-automation
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (database, JMeter path, etc.)

# 3. Set up database
bun run db:generate
bun run db:migrate
bun run db:seed

# 4. Start development server
bun run dev
# App runs at http://localhost:3100
```

## Available Scripts

| Command             | Description                              |
|---------------------|------------------------------------------|
| `bun run dev`       | Start all packages in development mode   |
| `bun run build`     | Build all packages for production        |
| `bun run lint`      | Run ESLint across all packages           |
| `bun run test`      | Run tests across all packages            |
| `bun run clean`     | Clean build artifacts                    |
| `bun run db:generate` | Generate Drizzle migration files       |
| `bun run db:migrate`  | Apply pending migrations               |
| `bun run db:seed`     | Seed database with default data         |
| `bun run db:studio`   | Open Drizzle Studio (DB GUI)            |

## Environment Variables

See [`.env.example`](.env.example) for all available configuration options. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./data/db/perf-test.db` |
| `DATA_DIR` | Base directory for test data/reports | `./data` |
| `JMETER_PATH` | Path to JMeter executable | `/usr/bin/jmeter` |
| `INFLUXDB_URL` | InfluxDB server URL | `http://localhost:8086` |
| `GRAFANA_URL` | Grafana server URL | `http://localhost:3000` |
| `CONFLUENCE_URL` | Confluence base URL | — |

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Next.js API Routes, Drizzle ORM, libSQL (SQLite)
- **Build:** Turborepo, Bun, TypeScript 5
- **Testing:** Vitest
- **Data:** React Query, Sonner (toasts), Server-Sent Events (live updates)

## Project Structure

### Key Directories

```
apps/web/src/
├── app/
│   ├── (dashboard)/     # Dashboard pages (baselines, versions, scenarios, etc.)
│   └── api/             # API routes for all resources
├── components/ui/       # shadcn/ui components
├── lib/
│   ├── api/             # React Query hooks and API client
│   ├── hooks/           # Custom hooks (SSE, etc.)
│   ├── validation.ts    # Zod validation schemas
│   └── api-utils.ts     # API response helpers
```

### Database Schema

The application uses SQLite via Drizzle ORM with the following tables:

- `scenarios` — Test scenario configurations
- `test_types` — Load vs Stress test types
- `versions` — Application version tracking
- `jmx_scripts` — JMeter script management
- `baselines` — Performance baseline metrics
- `test_runs` — Test execution records
- `test_statistics` — Per-transaction results
- `reports` — Generated report metadata
- `grafana_snapshots` — Captured dashboard images
- `settings` — Application configuration
- `schedules` — Automated test schedules

## Deployment

### Local / VM

```bash
bun install
bun run build
bun run start  # Starts on port 3100
```

### Docker (coming soon)

A `Dockerfile` is planned for containerized deployment.

## Contributing

1. Create a feature branch from `main`
2. Make changes and ensure `bun run lint` passes
3. Run `bun run test` to verify tests pass
4. Submit a pull request
