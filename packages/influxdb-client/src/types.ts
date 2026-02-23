export interface InfluxDBConfig {
  url: string;
  database: string;
  username?: string;
  password?: string;
  timeout?: number;
}

export interface QueryResult {
  results: QueryResultSeries[];
  error?: string;
}

export interface QueryResultSeries {
  statement_id: number;
  series?: {
    name: string;
    columns: string[];
    values: (string | number | null)[][];
    tags?: Record<string, string>;
  }[];
  error?: string;
}

export interface InfluxDBRow {
  [key: string]: string | number | null;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface TransactionQueryParams {
  testName: string;
  timeRange?: TimeRange;
  aggregationInterval?: string;
}

export interface TimeSeriesQueryParams extends TransactionQueryParams {
  transactionName?: string;
  interval?: string;
}

export interface InfluxDBConnectionStatus {
  connected: boolean;
  version?: string;
  error?: string;
  responseTime?: number;
}
