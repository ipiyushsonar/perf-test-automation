import type {
  InfluxDBConfig,
  QueryResult,
  InfluxDBConnectionStatus,
} from "./types";

export class InfluxDBClient {
  private config: InfluxDBConfig;
  private baseUrl: string;

  constructor(config: InfluxDBConfig) {
    this.config = config;
    this.baseUrl = config.url.replace(/\/$/, "");
  }

  async query(influxQL: string): Promise<QueryResult> {
    const url = new URL(`${this.baseUrl}/query`);
    
    const params = new URLSearchParams({
      db: this.config.database,
      q: influxQL,
      epoch: "ms",
    });

    if (this.config.username) {
      params.set("u", this.config.username);
    }
    if (this.config.password) {
      params.set("p", this.config.password);
    }

    url.search = params.toString();

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: this.config.timeout
        ? AbortSignal.timeout(this.config.timeout)
        : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`InfluxDB query failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as QueryResult;

    if (data.error) {
      throw new Error(`InfluxDB query error: ${data.error}`);
    }

    return data;
  }

  async ping(): Promise<InfluxDBConnectionStatus> {
    const startTime = Date.now();

    try {
      const url = new URL(`${this.baseUrl}/ping`);

      const response = await fetch(url.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const version = response.headers.get("X-Influxdb-Version") || undefined;
        return {
          connected: true,
          version,
          responseTime,
        };
      }

      return {
        connected: false,
        error: `HTTP ${response.status}`,
        responseTime,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      };
    }
  }

  async getDatabases(): Promise<string[]> {
    const result = await this.query("SHOW DATABASES");

    const databases: string[] = [];
    const series = result.results[0]?.series?.[0];
    if (series) {
      const nameIndex = series.columns.indexOf("name");
      for (const row of series.values || []) {
        const name = row[nameIndex];
        if (typeof name === "string") {
          databases.push(name);
        }
      }
    }

    return databases;
  }

  async getMeasurements(): Promise<string[]> {
    const result = await this.query("SHOW MEASUREMENTS");

    const measurements: string[] = [];
    const series = result.results[0]?.series?.[0];
    if (series) {
      const nameIndex = series.columns.indexOf("name");
      for (const row of series.values || []) {
        const name = row[nameIndex];
        if (typeof name === "string") {
          measurements.push(name);
        }
      }
    }

    return measurements;
  }

  async getTagKeys(measurement: string): Promise<string[]> {
    const result = await this.query(`SHOW TAG KEYS FROM "${measurement}"`);

    const keys: string[] = [];
    const series = result.results[0]?.series?.[0];
    if (series) {
      const keyIndex = series.columns.indexOf("tagKey");
      for (const row of series.values || []) {
        const key = row[keyIndex];
        if (typeof key === "string") {
          keys.push(key);
        }
      }
    }

    return keys;
  }

  getConfig(): InfluxDBConfig {
    return { ...this.config };
  }
}

let _client: InfluxDBClient | null = null;

export function getInfluxClient(config?: InfluxDBConfig): InfluxDBClient {
  if (!_client) {
    if (!config) {
      const url = process.env.INFLUXDB_URL || "http://localhost:8086";
      const database = process.env.INFLUXDB_DATABASE || "jmeter";
      const username = process.env.INFLUXDB_USERNAME || undefined;
      const password = process.env.INFLUXDB_PASSWORD || undefined;

      config = { url, database, username, password };
    }
    _client = new InfluxDBClient(config);
  }
  return _client;
}

export function resetInfluxClient(): void {
  _client = null;
}
