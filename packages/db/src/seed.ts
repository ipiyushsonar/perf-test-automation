import { getDb } from "./index";
import { scenarios, testTypes, settings } from "./schema";

const db = getDb();

console.log("Seeding database...");

// Seed test types
const existingTestTypes = await db.select().from(testTypes);
if (existingTestTypes.length === 0) {
  await db.insert(testTypes).values([
    {
      name: "load",
      displayName: "Load Test",
      description: "Standard load test with normal user count",
    },
    {
      name: "stress",
      displayName: "Stress Test",
      description: "High-load stress test with elevated user count",
    },
  ]);
  console.log("  Seeded test types: load, stress");
}

// Seed default scenarios
const existingScenarios = await db.select().from(scenarios);
if (existingScenarios.length === 0) {
  await db.insert(scenarios).values([
    {
      name: "prod",
      displayName: "Production",
      description: "Production module performance test",
      testType: "combined",
      loadUserCount: 25,
      stressUserCount: 50,
      durationMinutes: 60,
      rampUpSeconds: 60,
      cooldownSeconds: 900,
    },
    {
      name: "rev",
      displayName: "Revenue",
      description: "Revenue module performance test",
      testType: "combined",
      loadUserCount: 25,
      stressUserCount: 50,
      durationMinutes: 60,
      rampUpSeconds: 60,
      cooldownSeconds: 900,
    },
    {
      name: "trans",
      displayName: "Transportation",
      description: "Transportation module performance test",
      testType: "combined",
      loadUserCount: 25,
      stressUserCount: 50,
      durationMinutes: 60,
      rampUpSeconds: 60,
      cooldownSeconds: 900,
    },
    {
      name: "uid",
      displayName: "UID",
      description: "UID module performance test (standalone)",
      testType: "standalone",
      loadUserCount: 22,
      stressUserCount: 44,
      durationMinutes: 60,
      rampUpSeconds: 60,
      cooldownSeconds: 900,
    },
  ]);
  console.log("  Seeded scenarios: prod, rev, trans, uid");
}

// Seed default settings
const existingSettings = await db.select().from(settings);
if (existingSettings.length === 0) {
  await db.insert(settings).values([
    // InfluxDB
    {
      category: "influxdb",
      key: "url",
      value: JSON.stringify("http://localhost:8086"),
      description: "InfluxDB server URL",
    },
    {
      category: "influxdb",
      key: "database",
      value: JSON.stringify("jmeter"),
      description: "InfluxDB database name for JMeter metrics",
    },
    {
      category: "influxdb",
      key: "username",
      value: JSON.stringify(""),
      description: "InfluxDB username (optional)",
    },
    {
      category: "influxdb",
      key: "password",
      value: JSON.stringify(""),
      description: "InfluxDB password (optional)",
    },
    // Grafana
    {
      category: "grafana",
      key: "url",
      value: JSON.stringify("http://localhost:3000"),
      description: "Grafana server URL",
    },
    {
      category: "grafana",
      key: "apiToken",
      value: JSON.stringify(""),
      description: "Grafana API token (Service Account Token)",
    },
    {
      category: "grafana",
      key: "systemDashboardUid",
      value: JSON.stringify(""),
      description: "Telegraf System Dashboard UID",
    },
    {
      category: "grafana",
      key: "jmeterDashboardUid",
      value: JSON.stringify(""),
      description: "JMeter Dashboard UID",
    },
    // Confluence
    {
      category: "confluence",
      key: "url",
      value: JSON.stringify(""),
      description: "Confluence base URL",
    },
    {
      category: "confluence",
      key: "username",
      value: JSON.stringify(""),
      description: "Confluence username/email",
    },
    {
      category: "confluence",
      key: "apiToken",
      value: JSON.stringify(""),
      description: "Confluence API token",
    },
    {
      category: "confluence",
      key: "spaceKey",
      value: JSON.stringify(""),
      description: "Confluence space key",
    },
    {
      category: "confluence",
      key: "parentPageId",
      value: JSON.stringify(""),
      description: "Parent page ID for test reports",
    },
    // Runner defaults
    {
      category: "runner",
      key: "defaultRunnerType",
      value: JSON.stringify("local"),
      description: "Default test runner type (local/ssh/jenkins)",
    },
    {
      category: "runner",
      key: "jmeterPath",
      value: JSON.stringify("/usr/bin/jmeter"),
      description: "Path to JMeter executable",
    },
    {
      category: "runner",
      key: "jmeterHome",
      value: JSON.stringify("/opt/jmeter"),
      description: "JMeter home directory",
    },
    // General
    {
      category: "general",
      key: "dataDir",
      value: JSON.stringify("./data"),
      description: "Base data directory",
    },
    {
      category: "general",
      key: "defaultCooldownSeconds",
      value: JSON.stringify(900),
      description: "Default cooldown between tests (seconds)",
    },
    {
      category: "general",
      key: "autoGenerateReport",
      value: JSON.stringify(true),
      description: "Automatically generate report after test completion",
    },
  ]);
  console.log("  Seeded default settings");
}

console.log("Seeding completed.");
